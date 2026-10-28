import { useState } from "react";
import { 
  useListTaskTemplates, 
  useCreateTaskTemplate, 
  useUpdateTaskTemplate,
  useDeleteTaskTemplate,
  TaskTemplate
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Plus, Pencil, Trash2, Monitor, Laptop, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function TaskTemplates() {
  const { data: templates, isLoading, refetch } = useListTaskTemplates();
  const createTemplate = useCreateTaskTemplate();
  const updateTemplate = useUpdateTaskTemplate();
  const deleteTemplate = useDeleteTaskTemplate();
  const { toast } = useToast();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  
  // Editor form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [applicableTo, setApplicableTo] = useState<"virtual" | "in-person" | "all">("all");

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleOpenEditor = (template?: TaskTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTitle(template.title);
      setDescription(template.description || "");
      setApplicableTo(template.applicableTo);
    } else {
      setEditingTemplate(null);
      setTitle("");
      setDescription("");
      setApplicableTo("all");
    }
    setIsEditorOpen(true);
  };

  const handleSave = () => {
    if (!title) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    const payload = {
      title,
      description: description || undefined,
      applicableTo,
    };

    if (editingTemplate) {
      updateTemplate.mutate(
        { id: editingTemplate.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Task updated successfully" });
            setIsEditorOpen(false);
            refetch();
          }
        }
      );
    } else {
      createTemplate.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Task created successfully" });
            setIsEditorOpen(false);
            refetch();
          }
        }
      );
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTemplate.mutate(
        { id: deleteId },
        {
          onSuccess: () => {
            toast({ title: "Task template deleted" });
            setDeleteId(null);
            refetch();
          }
        }
      );
    }
  };

  // Group templates by applicability
  const groupedTemplates = templates ? {
    all: templates.filter(t => t.applicableTo === 'all'),
    virtual: templates.filter(t => t.applicableTo === 'virtual'),
    inPerson: templates.filter(t => t.applicableTo === 'in-person'),
  } : { all: [], virtual: [], inPerson: [] };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Task Templates</h1>
          <p className="text-muted-foreground mt-1">Checklist items automatically assigned to new hires.</p>
        </div>
        <Button onClick={() => handleOpenEditor()}>
          <Plus className="mr-2 size-4" />
          Add Task Template
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="grid gap-8">
          <TemplateSection 
            title="Universal Tasks" 
            description="Assigned to EVERY new hire."
            icon={<Globe className="size-5 text-primary" />}
            templates={groupedTemplates.all}
            onEdit={handleOpenEditor}
            onDelete={setDeleteId}
          />
          
          <div className="grid md:grid-cols-2 gap-8">
            <TemplateSection 
              title="Virtual Only" 
              description="Assigned only to remote hires."
              icon={<Monitor className="size-5 text-blue-500" />}
              templates={groupedTemplates.virtual}
              onEdit={handleOpenEditor}
              onDelete={setDeleteId}
            />
            
            <TemplateSection 
              title="In-Person Only" 
              description="Assigned only to office hires."
              icon={<Laptop className="size-5 text-purple-500" />}
              templates={groupedTemplates.inPerson}
              onEdit={handleOpenEditor}
              onDelete={setDeleteId}
            />
          </div>
        </div>
      )}

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Task Template" : "New Task Template"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g., Verify background check completion" 
              />
            </div>

            <div className="space-y-2">
              <Label>Applicable To</Label>
              <Select value={applicableTo} onValueChange={(v: any) => setApplicableTo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hires (Universal)</SelectItem>
                  <SelectItem value="virtual">Virtual Hires Only</SelectItem>
                  <SelectItem value="in-person">In-Person Hires Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Optional Description</Label>
              <Input 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Instructions or links for the recruiter..." 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createTemplate.isPending || updateTemplate.isPending}>
              Save Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this template. It will not affect tasks already assigned to existing hires, but future hires will not receive this task automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TemplateSection({ 
  title, 
  description, 
  icon, 
  templates,
  onEdit,
  onDelete
}: { 
  title: string, 
  description: string, 
  icon: React.ReactNode, 
  templates: TaskTemplate[],
  onEdit: (t: TaskTemplate) => void,
  onDelete: (id: number) => void
}) {
  return (
    <Card>
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {templates.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No templates configured for this category.
          </div>
        ) : (
          <div className="divide-y">
            {templates.map(template => (
              <div key={template.id} className="p-4 flex items-start justify-between group hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                  <CheckSquare className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">{template.title}</div>
                    {template.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(template)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(template.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
