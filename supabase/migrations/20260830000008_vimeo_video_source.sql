-- Video propio Fase 2: Vimeo as a third video_provider, alongside YouTube
-- and direct_url. video_source stores the Vimeo numeric video ID, or
-- "<id>:<hash>" when the video uses Vimeo's privacy-hash ("hidden") mode --
-- see src/lib/vimeo.ts.
alter type public.video_provider add value 'vimeo';
