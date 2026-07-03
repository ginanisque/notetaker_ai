export default function MeetingAudioPlayer({ audioUrl }: { audioUrl: string }) {
  return (
    <div className="surface mb-8 rounded-md p-5">
      <h2 className="text-lg font-semibold text-ink">Recording</h2>
      <audio src={audioUrl} controls className="mt-3 w-full" />
    </div>
  );
}
