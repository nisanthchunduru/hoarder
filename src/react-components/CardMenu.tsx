import actions from "../actions";
import { Link } from "../interfaces";
import DropdownMenu from "./DropdownMenu";

export default function CardMenu({ link }: { link: Link }) {
  return (
    <DropdownMenu
      className="card-menu"
      trigger={({ toggle }) => (
        <button type="button" className="card-menu-trigger" aria-label="More actions" onClick={toggle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="4" cy="8" r="1.2" fill="currentColor"/>
            <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
            <circle cx="12" cy="8" r="1.2" fill="currentColor"/>
          </svg>
        </button>
      )}
    >
      {({ close }) => (
        <>
          <button onClick={() => { actions.archiveLink(link.id!); close(); }}>
            {link.archived ? "Unarchive" : "Archive"}
          </button>
          <button className="danger" onClick={() => { actions.deleteLink(link.id!); close(); }}>
            Delete
          </button>
        </>
      )}
    </DropdownMenu>
  );
}
