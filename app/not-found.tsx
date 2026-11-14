import { COPY_DEFAULT as COPY } from "@/brand/copy";
import { SurveyMessage } from "@/components/survey/SurveyMessage";

/** 404 im Claus-Look (gleiches Raster wie der Bogen). */
export default function NotFound() {
  return <SurveyMessage title={COPY.notFound.title} sub={COPY.notFound.sub} />;
}
