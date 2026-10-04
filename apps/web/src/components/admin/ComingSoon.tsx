import { Clock } from "lucide-react";
import { PageHeader } from "@/components/partner/PageHeader";
import { Panel } from "@/components/partner/ui-blocks";

/** Écran du prototype pas encore relié aux vraies données. */
export function ComingSoon({ title, subtitle, what }: { title: string; subtitle: string; what: string }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Panel>
        <div className="flex items-start gap-3 text-[14px]">
          <Clock className="mt-0.5 h-5 w-5 flex-none text-partner-heading" aria-hidden="true" />
          <div>
            <b className="block text-partner-heading">Bientôt disponible</b>
            <p className="m-0 mt-1 text-partner-muted">{what}</p>
          </div>
        </div>
      </Panel>
    </>
  );
}
