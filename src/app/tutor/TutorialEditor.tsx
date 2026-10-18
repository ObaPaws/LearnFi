import { updateTutorial } from "./actions";
import { MuxUpload } from "./MuxUpload";
import { DeleteTutorialForm } from "./DeleteTutorialForm";

export function TutorialEditor({ tutorial, categories, subjects }: { tutorial: any; categories: Array<{ id: string; name: string }>; subjects: Array<{ id: string; name: string }> }) {
  const published = tutorial.status === "published" && tutorial.is_published;
  return <details className="tutorial-editor">
    <summary>Edit or delete tutorial</summary>
    <form action={updateTutorial} className="tutor-form">
      <input type="hidden" name="tutorialId" value={tutorial.id}/>
      <label>TITLE<input name="title" minLength={3} maxLength={140} defaultValue={tutorial.title} required/></label>
      <label>DESCRIPTION<textarea name="description" maxLength={4000} rows={3} defaultValue={tutorial.description ?? tutorial.summary ?? ""}/></label>
      <div className="form-field-row"><label>CATEGORY<select name="categoryId" defaultValue={tutorial.category_id ?? ""}><option value="">Choose a category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>SUBJECT<select name="subjectId" defaultValue={tutorial.subject_id ?? ""}><option value="">Choose a subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <div className="form-field-row"><label>SUBCATEGORY<input name="subcategory" maxLength={100} defaultValue={tutorial.subcategory ?? ""}/></label><label>DIFFICULTY<select name="difficulty" defaultValue={tutorial.difficulty ?? "beginner"}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label></div>
      <button className="small-action" type="submit">Save tutorial</button>
    </form>
    {published && <div className="tutorial-video-replace"><strong>Replace published video</strong><p>The current video stays available until Mux finishes processing its replacement.</p><MuxUpload tutorialId={tutorial.id} videoStatus={tutorial.video_processing_status} playbackId={tutorial.playback_id} ready={tutorial.video_processing_status === "ready" && Boolean(tutorial.playback_id)} replacementPending={tutorial.video_replacement_pending} showPreview={false}/></div>}
    <DeleteTutorialForm tutorialId={tutorial.id} title={tutorial.title} published={published} hasPublishedHistory={tutorial.publication_number !== null}/>
  </details>;
}
