import { useState } from "react";
import { 
  useListCommTemplates, 
  useCreateCommTemplate, 
  useUpdateCommTemplate,
  useDeleteCommTemplate,
  useListHires,
  CommTemplate
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus, Pencil, Trash2, Mail, Users, Sparkles, Loader2, Copy, CheckCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { format, parseISO } from "date-fns";

export default function CommTemplates() {
  const { data: templates, isLoading, refetch } = useListCommTemplates();
  const { data: hires } = useListHires();
  const createTemplate = useCreateCommTemplate();
  const updateTemplate = useUpdateCommTemplate();
  const deleteTemplate = useDeleteCommTemplate();
  const { toast } = useToast();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommTemplate | null>(null);
  
  // Editor form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientType, setRecipientType] = useState<"hire" | "hiring-manager">("hire");
  const [sendDayOffset, setSendDayOffset] = useState<number>(-7);
  const [timingDescription, setTimingDescription] = useState("Relative to orientation date");
  const [applicableTo, setApplicableTo] = useState<"virtual" | "in-person" | "all">("all");
  const [audience, setAudience] = useState<"standard" | "vip">("standard");

  const [deleteId, setDeleteId] = useState<number | null>(null);

  // AI Draft dialog state
  const [aiDraftTemplate, setAiDraftTemplate] = useState<CommTemplate | null>(null);
  const [aiHireId, setAiHireId] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ subject: string; body: string } | null>(null);
  const [aiCopied, setAiCopied] = useState(false);

  const handleOpenEditor = (template?: CommTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setName(template.name);
      setSubject(template.subject);
      setBody(template.body);
      setRecipientType(template.recipientType);
      setSendDayOffset(template.sendDayOffset);
      setTimingDescription(template.timingDescription);
      setApplicableTo(template.applicableTo);
      setAudience(template.audience ?? "standard");
    } else {
      setEditingTemplate(null);
      setName("");
      setSubject("");
      setBody("");
      setRecipientType("hire");
      setSendDayOffset(-7);
      setTimingDescription("Relative to orientation date");
      setApplicableTo("all");
      setAudience("standard");
    }
    setIsEditorOpen(true);
  };

  const handleSave = () => {
    if (!name || !subject || !body) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const payload = {
      name,
      subject,
      body,
      recipientType,
      sendDayOffset: Number(sendDayOffset),
      timingDescription,
      applicableTo,
      audience,
    };

    if (editingTemplate) {
      updateTemplate.mutate(
        { id: editingTemplate.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Template updated successfully" });
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
            toast({ title: "Template created successfully" });
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
            toast({ title: "Template deleted" });
            setDeleteId(null);
            refetch();
          }
        }
      );
    }
  };

  const openAiDraft = (template: CommTemplate) => {
    setAiDraftTemplate(template);
    setAiHireId("");
    setAiResult(null);
    setAiCopied(false);
  };

  const handleGenerateDraft = async () => {
    if (!aiDraftTemplate || !aiHireId) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/ai/draft-comm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: aiDraftTemplate.id, hireId: parseInt(aiHireId) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to generate draft");
      }
      const data = await res.json();
      setAiResult(data);
    } catch (err: any) {
      toast({ title: err.message || "Failed to generate AI draft", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyToEditor = () => {
    if (!aiResult || !aiDraftTemplate) return;
    // Pre-populate editor with AI draft
    setEditingTemplate(aiDraftTemplate);
    setName(aiDraftTemplate.name);
    setSubject(aiResult.subject);
    setBody(aiResult.body);
    setRecipientType(aiDraftTemplate.recipientType);
    setSendDayOffset(aiDraftTemplate.sendDayOffset);
    setTimingDescription(aiDraftTemplate.timingDescription);
    setApplicableTo(aiDraftTemplate.applicableTo);
    setAiDraftTemplate(null);
    setIsEditorOpen(true);
    toast({ title: "AI draft loaded into editor" });
  };

  const handleCopyText = () => {
    if (!aiResult) return;
    const text = `Subject: ${aiResult.subject}\n\n${aiResult.body}`;
    navigator.clipboard.writeText(text);
    setAiCopied(true);
    setTimeout(() => setAiCopied(false), 2000);
  };

  const formatOffset = (offset: number) => {
    if (offset === 0) return "Day of orientation";
    if (offset < 0) return `${Math.abs(offset)} days before`;
    return `${offset} days after`;
  };

  const formatApplicableTo = (value: CommTemplate["applicableTo"]) => {
    if (value === "virtual") return "Virtual hires only";
    if (value === "in-person") return "In-person hires only";
    return "All hires";
  };

  const upcomingHires = hires?.filter(h => h.orientationDate >= new Date().toISOString().split("T")[0]) ?? [];

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication Templates</h1>
          <p className="text-muted-foreground mt-1">Manage automated emails sent to new hires and managers.</p>
        </div>
        <Button onClick={() => handleOpenEditor()}>
          <Plus className="mr-2 size-4" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))
        ) : !templates || templates.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
            <FileText className="size-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No templates found</h3>
            <p className="text-muted-foreground mt-1">Create your first communication template to get started.</p>
            <Button className="mt-4" onClick={() => handleOpenEditor()}>
              Create Template
            </Button>
          </div>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="relative overflow-hidden group">
              <div className={`absolute top-0 bottom-0 left-0 w-1 ${template.recipientType === 'hire' ? 'bg-blue-500' : 'bg-orange-500'}`} />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-1">{template.name}</CardTitle>
                  <CardDescription className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
                      {template.recipientType === 'hire' ? (
                        <><Users className="size-4 text-blue-500" /> To: New Hire</>
                      ) : (
                        <><Users className="size-4 text-orange-500" /> To: Hiring Manager</>
                      )}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span>Timing: {template.timingDescription}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{formatApplicableTo(template.applicableTo)}</span>
                    {template.audience === "vip" && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 text-[10px]">
                        VIP chain
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 hover:border-violet-300 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-950/40"
                    onClick={() => openAiDraft(template)}
                  >
                    <Sparkles className="size-3.5" />
                    AI Draft
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenEditor(template)}>
                    <Pencil className="size-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteId(template.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-md p-4 border font-mono text-sm">
                  <div className="font-semibold mb-2 border-b pb-2 flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    Subject: {template.subject}
                  </div>
                  <div className="whitespace-pre-wrap text-muted-foreground line-clamp-3">
                    {template.body}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              Configure the automated email. Use variables like {'{hireName}'}, {'{managerName}'}, or {'{orientationDate}'}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
            <div className="space-y-2">
              <Label>Template Name (Internal)</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g., Welcome Email - 1 Week Prior" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recipient Type</Label>
                <Select value={recipientType} onValueChange={(v: any) => setRecipientType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hire">New Hire</SelectItem>
                    <SelectItem value="hiring-manager">Hiring Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timing (Days relative to orientation)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={sendDayOffset} 
                    onChange={e => setSendDayOffset(parseInt(e.target.value) || 0)}
                  />
                  <div className="flex items-center px-3 bg-muted rounded-md text-sm whitespace-nowrap">
                    {formatOffset(sendDayOffset)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Timing description</Label>
                <Input
                  value={timingDescription}
                  onChange={e => setTimingDescription(e.target.value)}
                  placeholder="e.g., 3 weeks before start date"
                />
                <p className="text-xs text-muted-foreground">
                  Shown on the template card for event-based and time-specific triggers.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Applies to</Label>
                <Select value={applicableTo} onValueChange={(v: "virtual" | "in-person" | "all") => setApplicableTo(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All hires</SelectItem>
                    <SelectItem value="virtual">Virtual hires only</SelectItem>
                    <SelectItem value="in-person">In-person hires only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Communication Chain</Label>
              <Select value={audience} onValueChange={(v: "standard" | "vip") => setAudience(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard onboarding</SelectItem>
                  <SelectItem value="vip">VIP curated onboarding</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                VIP chain templates are applied only to hires tagged as VIP.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                placeholder="Welcome to the team!" 
              />
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
              <Label>Email Body</Label>
              <Textarea 
                value={body} 
                onChange={e => setBody(e.target.value)} 
                className="flex-1 resize-none font-mono text-sm leading-relaxed p-4"
                placeholder={`Hi {hireName},\n\nWe are excited to welcome you...`}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createTemplate.isPending || updateTemplate.isPending}>
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Draft Dialog */}
      <Dialog open={!!aiDraftTemplate} onOpenChange={(open) => !open && setAiDraftTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-violet-500" />
              AI Draft
            </DialogTitle>
            <DialogDescription>
              Generate a personalized version of <strong>{aiDraftTemplate?.name}</strong> for a specific hire.
              Uses the hire's profile to replace placeholders and add relevant context.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 py-4">
            {/* Hire selector */}
            <div className="space-y-2">
              <Label>Personalize for which hire?</Label>
              <Select value={aiHireId} onValueChange={setAiHireId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an upcoming hire…" />
                </SelectTrigger>
                <SelectContent>
                  {upcomingHires.length === 0 ? (
                    <SelectItem value="__none__" disabled>No upcoming hires found</SelectItem>
                  ) : (
                    upcomingHires.map(h => (
                      <SelectItem key={h.id} value={String(h.id)}>
                        {h.firstName} {h.lastName} — {h.title} · {format(parseISO(h.orientationDate), "MMM d")}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerateDraft}
              disabled={!aiHireId || aiLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              {aiLoading ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="mr-2 size-4" /> Generate Draft</>
              )}
            </Button>

            {/* Generated preview */}
            {aiResult && (
              <div className="space-y-3 border rounded-lg p-4 bg-violet-50/50 dark:bg-violet-950/20">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">
                    AI-Generated Draft
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground"
                    onClick={handleCopyText}
                  >
                    {aiCopied ? <><CheckCheck className="size-3.5 text-emerald-500" /> Copied!</> : <><Copy className="size-3.5" /> Copy all</>}
                  </Button>
                </div>
                <div className="bg-white dark:bg-background rounded border p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subject</div>
                  <p className="font-medium text-sm">{aiResult.subject}</p>
                </div>
                <div className="bg-white dark:bg-background rounded border p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Body</div>
                  <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{aiResult.body}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setAiDraftTemplate(null)}>Close</Button>
            {aiResult && (
              <Button onClick={handleCopyToEditor} className="gap-1.5">
                <Pencil className="size-4" />
                Open in Editor
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this communication template. Existing scheduled communications using this template will not be affected, but no new ones will be generated.
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
