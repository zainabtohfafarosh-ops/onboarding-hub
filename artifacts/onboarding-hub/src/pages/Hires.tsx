import { useState } from "react";
import { Link } from "wouter";
import { useListHires, HireOrientationType } from "@workspace/api-client-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Search, Monitor, Laptop, Filter, UserPlus, CheckCircle2, Crown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";

export default function Hires() {
  const [search, setSearch] = useState("");
  const [orientationType, setOrientationType] = useState<string>("all");
  
  const debouncedSearch = useDebounce(search, 300);

  const queryParams: any = {};
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (orientationType && orientationType !== "all") queryParams.orientationType = orientationType as HireOrientationType;

  const { data: hires, isLoading } = useListHires(queryParams);

  return (
    <div className="flex-1 p-8 flex flex-col h-screen overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Hires</h1>
          <p className="text-muted-foreground mt-1">Directory of all pending new hires</p>
        </div>
        <Button asChild>
          <Link href="/hires/new">
            <UserPlus className="mr-2 size-4" />
            Add Hire
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, role..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={orientationType} onValueChange={setOrientationType}>
          <SelectTrigger className="w-[180px] bg-card">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span><SelectValue placeholder="Filter type" /></span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="virtual">Virtual</SelectItem>
            <SelectItem value="in-person">In-Person</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto border rounded-md bg-card shadow-sm">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Orientation Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Recruiter</TableHead>
              <TableHead>Readiness</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                </TableRow>
              ))
            ) : !hires || hires.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No hires found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              hires.map((hire) => (
                <TableRow key={hire.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/hires/${hire.id}`}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-1.5">
                      {hire.firstName} {hire.lastName}
                      {hire.isVip && (
                        <Badge className="h-5 px-1.5 bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 text-[10px]">
                          <Crown className="size-2.5 mr-0.5" />
                          VIP
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {hire.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{hire.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {hire.department || "No Dept"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {format(parseISO(hire.orientationDate), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {hire.orientationType === 'virtual' ? (
                      <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200">
                        <Monitor className="mr-1 size-3" /> Virtual
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-purple-50/50 text-purple-700 border-purple-200">
                        <Laptop className="mr-1 size-3" /> In-Person
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{hire.hiringManager}</TableCell>
                  <TableCell className="text-sm">{hire.recruiter}</TableCell>
                  <TableCell>
                    {hire.readinessScore === 100 ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                        <CheckCircle2 className="size-3.5" />
                        100%
                      </span>
                    ) : (
                      <span className={`text-sm font-semibold tabular-nums ${
                        (hire.readinessScore ?? 0) >= 80
                          ? "text-emerald-600"
                          : (hire.readinessScore ?? 0) >= 50
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}>
                        {hire.readinessScore ?? 0}%
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
