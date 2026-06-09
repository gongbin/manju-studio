-- ManjuStudio · per-shot reference material + generated video URL（按 taskid 回写视频信息）
ALTER TABLE shots ADD COLUMN refs TEXT;
ALTER TABLE shots ADD COLUMN video_url TEXT;
ALTER TABLE generation_tasks ADD COLUMN video_url TEXT;
