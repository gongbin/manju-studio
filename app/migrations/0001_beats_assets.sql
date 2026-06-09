-- ManjuStudio · add shot time-beats（时长结构）and 素材库 display fields
ALTER TABLE shots ADD COLUMN beats TEXT;

ALTER TABLE assets ADD COLUMN name TEXT;
ALTER TABLE assets ADD COLUMN kind TEXT;
ALTER TABLE assets ADD COLUMN ext TEXT;
ALTER TABLE assets ADD COLUMN tone TEXT;
ALTER TABLE assets ADD COLUMN store_label TEXT;
ALTER TABLE assets ADD COLUMN size_label TEXT;
