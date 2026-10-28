import { Link } from "wouter";
import { useGetUpcomingOrientations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { CalendarDays, Users, MapPin, Monitor, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Orientations() {
  const { data: orientations, isLoading } = useGetUpcomingOrientations();

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orientations</h1>
          <p className="text-muted-foreground mt-1">Upcoming orientation weeks and cohorts.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : orientations && orientations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {orientations.map((orientation) => (
            <Card key={orientation.date} className="flex flex-col hover-elevate transition-all border-l-4 border-l-primary">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <CalendarDays className="size-5 text-muted-foreground" />
                      {format(parseISO(orientation.date), "MMMM d, yyyy")}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1 font-medium">
                      {orientation.totalHires} Hires
                    </div>
                  </div>
                  <Badge variant={orientation.totalHires > 10 ? "default" : "secondary"}>
                    {orientation.totalHires > 10 ? "Large Cohort" : "Standard"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <Monitor className="size-4 text-blue-500" />
                      <span>Virtual</span>
                    </div>
                    <span className="font-semibold">{orientation.virtualCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <Laptop className="size-4 text-purple-500" />
                      <span>In-Person</span>
                    </div>
                    <span className="font-semibold">{orientation.inPersonCount}</span>
                  </div>
                  
                  {orientation.locations && orientation.locations.length > 0 && (
                    <div className="pt-4 border-t">
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <MapPin className="size-3" />
                        Locations
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {orientation.locations.map(loc => (
                          <Badge key={loc} variant="outline" className="text-xs">{loc}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t flex gap-4 text-xs">
                    <div className="flex-1">
                      <div className="text-muted-foreground mb-1">Tasks</div>
                      <div className="font-medium flex items-center gap-1">
                        <div className={`size-2 rounded-full ${orientation.pendingTasksCount === 0 ? 'bg-green-500' : 'bg-amber-500'}`} />
                        {orientation.pendingTasksCount || 0} pending
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-muted-foreground mb-1">Comms</div>
                      <div className="font-medium flex items-center gap-1">
                        <div className={`size-2 rounded-full ${orientation.pendingCommsCount === 0 ? 'bg-green-500' : 'bg-amber-500'}`} />
                        {orientation.pendingCommsCount || 0} pending
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button className="w-full" asChild variant="secondary">
                  <Link href={`/orientations/${orientation.date}`}>
                    View Cohort Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
          <CalendarDays className="size-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No upcoming orientations</h3>
          <p className="text-muted-foreground mt-1">There are no orientations scheduled for the coming weeks.</p>
        </div>
      )}
    </div>
  );
}
