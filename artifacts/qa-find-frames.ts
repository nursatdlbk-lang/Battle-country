import { readFileSync } from 'node:fs';
import { BattleConfigSchema } from '../src/engine/battle-config';
import { createBattle, stepBattle } from '../src/engine/battle-engine';

const config = BattleConfigSchema.parse(JSON.parse(readFileSync(new URL('./kazakhstan-usa-review.json', import.meta.url), 'utf8')));
let state = createBattle(config);
for (let frame = 1; frame <= config.fps * config.maxDuration; frame++) {
  state = stepBattle(state, config);
  for (const event of state.events) {
    if (event.type === 'projectile_spawn' || event.type === 'ultimate_windup' || event.type === 'ultimate_cast' || event.type === 'special_hit' || event.type === 'summon_spawn') {
      console.log(frame, event.type, JSON.stringify(event));
    }
  }
}
