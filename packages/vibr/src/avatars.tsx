import type { AvatarId, AvatarProps } from "./types";
import "./avatars.css";
import { Nebula } from "./avatars/nebula";
import { Smiley } from "./avatars/smiley";

export { Nebula, Smiley };

function Avatar({
  avatar,
  state = "idle",
  mode = "",
  energy = 0,
  className,
}: AvatarProps & { readonly avatar: Exclude<AvatarId, "none"> }) {
  return (
    <span
      aria-hidden="true"
      className={["vibr-avatar", className].filter(Boolean).join(" ")}
      data-avatar={avatar}
      data-mode={mode || undefined}
      data-state={state}
      style={
        {
          "--vibr-energy": Math.min(1, Math.max(0, energy)),
        } as React.CSSProperties
      }
    >
      <i />
      <b />
      <em />
    </span>
  );
}
const form = (avatar: Exclude<AvatarId, "none">) => (props: AvatarProps) => (
  <Avatar {...props} avatar={avatar} />
);
export const Blob = form("blob");
export const Static = form("static");
export const Rorschach = form("rorschach");
export const Inkblot = form("inkblot");
export const Aurora = form("aurora");
export const Siri = form("siri");
export const Orbit = form("orbit");
export const Quasar = form("quasar");
export const Matrix = form("matrix");
export const Lattice = form("lattice");
export const Liquid = form("liquid");
export const Koi = form("koi");
export const Duel = form("duel");
export const Ember = form("ember");
export const BlackHole = form("blackhole");
export const AVATARS = {
  blob: Blob,
  static: Static,
  rorschach: Rorschach,
  inkblot: Inkblot,
  aurora: Aurora,
  nebula: Nebula,
  siri: Siri,
  orbit: Orbit,
  quasar: Quasar,
  matrix: Matrix,
  lattice: Lattice,
  liquid: Liquid,
  koi: Koi,
  duel: Duel,
  ember: Ember,
  blackhole: BlackHole,
  smiley: Smiley,
};
