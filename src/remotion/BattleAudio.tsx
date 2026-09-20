import React, { useMemo } from 'react';
import { Sequence, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { BattleConfig } from '../engine/battle-config';
import { BattleTimeline } from '../renderer/timeline-cache';
import {
  audioCueEvents,
  BattleAudioCue,
  BattleAudioUrls,
  DEFAULT_AUDIO_ASSET_PATHS,
  customAudioUrl,
  musicAudioSource,
} from '../audio/battle-audio-cues';

type AudioConfigWithUrls = BattleConfig['audio'] & BattleAudioUrls;
type BattleConfigWithAudioUrls = BattleConfig & {
  readonly audio: AudioConfigWithUrls;
  /** Backwards-compatible export field used by earlier saved compositions. */
  readonly musicUrl?: string;
};

export interface BattleAudioProps {
  readonly config: BattleConfigWithAudioUrls;
  readonly timeline: BattleTimeline;
  readonly offsetFrames?: number;
}

/** Resolves built-in assets through Remotion's public-directory URL mechanism. */
export function remotionAudioSource(cue: BattleAudioCue, audio?: BattleAudioUrls): string {
  return customAudioUrl(cue, audio) ?? staticFile(DEFAULT_AUDIO_ASSET_PATHS[cue].slice(1));
}

export const BattleAudio: React.FC<BattleAudioProps> = ({ config, timeline, offsetFrames = 0 }) => {
  const tracks = useMemo(() => {
    const audio = config.audio;
    const nodes: React.ReactNode[] = [];
    const music = musicAudioSource(audio, config.musicUrl);

    if (music) {
      nodes.push(<Sequence key="bg-music" from={offsetFrames}><Audio src={music} volume={audio.musicVolume} loop /></Sequence>);
    }

    for (const { event, cue } of audioCueEvents(timeline.allEvents)) {
      if (event.frame < 0 || event.frame >= timeline.totalFrames) continue;
      nodes.push(
        <Sequence key={`sfx-${cue}-${event.frame}-${nodes.length}`} from={offsetFrames + event.frame}>
          <Audio src={remotionAudioSource(cue, audio)} volume={audio.sfxVolume} />
        </Sequence>,
      );
    }

    return nodes;
  }, [config, timeline]);

  return <>{tracks}</>;
};
