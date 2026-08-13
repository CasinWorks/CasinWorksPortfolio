import { usePageMeta } from "../hooks/usePageMeta";
import { APPS_FOR_EVERYONE_PATH, SITE } from "../site";
import AppsForEveryoneApp from "../apps-for-everyone/App";
import "../apps-for-everyone/index.css";

export default function AppsForEveryonePage() {
  usePageMeta({
    title: `Apps For Everyone — ${SITE.name}`,
    description:
      "Consumer app directory from C. J. Casin / Casin Works — shipped tools, design system notes, and product specs.",
    path: APPS_FOR_EVERYONE_PATH,
  });

  return <AppsForEveryoneApp />;
}
