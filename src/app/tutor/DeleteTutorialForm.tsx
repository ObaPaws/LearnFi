"use client";

import { deleteTutorial } from "./actions";

export function DeleteTutorialForm({ tutorialId, title, published, hasPublishedHistory }: { tutorialId: string; title: string; published: boolean; hasPublishedHistory: boolean }) {
  const label = published ? "Delete tutorial" : hasPublishedHistory ? "Delete archived tutorial" : "Delete draft";
  return <form action={deleteTutorial} className="tutorial-delete-form" onSubmit={(event) => {
    if (!window.confirm(published
      ? `Remove “${title}” from the Academy? Published tutorials are archived and learner history is retained.`
      : hasPublishedHistory ? `Permanently remove the archived record for “${title}”? Its immutable publication history will remain.` : `Permanently delete the draft “${title}”? This cannot be undone.`)) event.preventDefault();
  }}><input type="hidden" name="tutorialId" value={tutorialId}/><button className="small-action" type="submit">{label}</button>{hasPublishedHistory && <small>{published ? "Published tutorials are archived to preserve learner progress and review history. Premium lessons with buyers cannot be removed. To remove a first-two free lesson, publish enough free replacements to keep two available." : "The original publication slot and audit history remain recorded."}</small>}</form>;
}
