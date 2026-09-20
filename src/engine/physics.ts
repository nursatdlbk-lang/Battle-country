import { Vec2, dot, sub, add, scale } from './vector';
import { ArenaBounds, circleVsArena, circleVsCircle } from './collision';

export interface Body {
  pos: Vec2;
  vel: Vec2;
  mass: number;
  radius: number;
}

export function resolveElasticCollision(
  a: Body,
  b: Body,
  restitution: number = 1.0,
): { a: Body; b: Body; collided: boolean } {
  const collision = circleVsCircle(a.pos, a.radius, b.pos, b.radius);
  if (!collision.colliding) {
    return { a, b, collided: false };
  }

  // Mass-weighted position separation to prevent overlap/sticking
  const invMassA = 1 / a.mass;
  const invMassB = 1 / b.mass;
  const totalInvMass = invMassA + invMassB;

  const posA = sub(a.pos, scale(collision.normal, collision.overlap * (invMassA / totalInvMass)));
  const posB = add(b.pos, scale(collision.normal, collision.overlap * (invMassB / totalInvMass)));

  const relativeVelocity = sub(b.vel, a.vel);
  const velocityAlongNormal = dot(relativeVelocity, collision.normal);

  // If already moving away from each other along collision normal, do not apply impulse
  if (velocityAlongNormal > 0) {
    return {
      a: { ...a, pos: posA },
      b: { ...b, pos: posB },
      collided: true,
    };
  }

  // Calculate impulse scalar: j = -(1 + e) * (v_rel . n) / (1/m1 + 1/m2)
  const j = -(1 + restitution) * velocityAlongNormal;
  const impulseScalar = j / totalInvMass;
  const impulse = scale(collision.normal, impulseScalar);

  // v'_A = v_A - impulse / m_A
  // v'_B = v_B + impulse / m_B
  const newVelA = sub(a.vel, scale(impulse, invMassA));
  const newVelB = add(b.vel, scale(impulse, invMassB));

  return {
    a: { ...a, pos: posA, vel: newVelA },
    b: { ...b, pos: posB, vel: newVelB },
    collided: true,
  };
}

export function resolveWallBounce(
  body: Body,
  arena: ArenaBounds,
  restitution: number = 1.0,
): { body: Body; bounced: boolean } {
  const collisions = circleVsArena(body.pos, body.radius, arena);
  if (collisions.length === 0) return { body, bounced: false };

  let newX = body.pos.x;
  let newY = body.pos.y;
  let newVx = body.vel.x;
  let newVy = body.vel.y;
  let bounced = false;

  for (const col of collisions) {
    if (col.edge === 'left') {
      newX = arena.x + body.radius;
      if (newVx < 0) {
        newVx = Math.abs(newVx) * restitution;
        bounced = true;
      }
    } else if (col.edge === 'right') {
      newX = arena.x + arena.width - body.radius;
      if (newVx > 0) {
        newVx = -Math.abs(newVx) * restitution;
        bounced = true;
      }
    } else if (col.edge === 'top') {
      newY = arena.y + body.radius;
      if (newVy < 0) {
        newVy = Math.abs(newVy) * restitution;
        bounced = true;
      }
    } else if (col.edge === 'bottom') {
      newY = arena.y + arena.height - body.radius;
      if (newVy > 0) {
        newVy = -Math.abs(newVy) * restitution;
        bounced = true;
      }
    }
  }

  return {
    body: {
      ...body,
      pos: { x: newX, y: newY },
      vel: { x: newVx, y: newVy },
    },
    bounced,
  };
}
