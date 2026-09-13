import { PointBackRoot } from "../ui/PointBackRoot";
import { usePointBack, type BrowserSurface } from "./use-pointback";

export function PointBackApp({ surface }: { surface: BrowserSurface }) {
  const application = usePointBack(surface);
  return <PointBackRoot {...application} />;
}
