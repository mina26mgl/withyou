import { api } from "./api";

export interface Me {
  user: { role: string };
  consomateur?: { onboarding_done: boolean | null } | null;
  partnerStatus?: "NONE" | "PENDING" | "REJECTED" | "ACTIVE";
}

/** Espace choisi sur le formulaire de connexion : app cliente ou espace pro (marque / admin). */
export type LoginSpace = "consumer" | "pro";

/** Espace d'arrivée d'un compte : console admin, dossier d'une marque en attente, espace marque ou app cliente. */
export function homePathFor(me: Me): string {
  if (me.user.role === "ADMIN") return "/admin";
  if (me.partnerStatus === "PENDING" || me.partnerStatus === "REJECTED") return "/ma-demande";
  return me.user.role === "CONSUMER" ? consumerHomePath(me) : "/accueil";
}

/** App cliente : l'accueil si l'onboarding est fait, sinon le parcours d'onboarding (première connexion). */
export function consumerHomePath(me: Me): string {
  return me.consomateur?.onboarding_done ? "/home" : "/";
}

/** Un compte consommatrice ne peut jamais entrer dans l'espace pro (marque / admin). */
export const PRO_SPACE_REFUSAL =
  "Ce compte est un compte consommatrice. Activez « Espace consommatrice » pour vous connecter.";

/**
 * Tout compte a une session cliente : admin et marques peuvent entrer dans
 * l'app cliente. Seul l'espace pro est fermé aux comptes consommatrice.
 * Renvoie la raison du refus, ou null.
 */
export function loginSpaceError(me: Me, space: LoginSpace): string | null {
  return space === "pro" && me.user.role === "CONSUMER" ? PRO_SPACE_REFUSAL : null;
}

/** Arrivée après connexion : l'app cliente si le toggle est activé, sinon l'espace du compte. */
export function landingPathFor(me: Me, space: LoginSpace): string {
  return space === "consumer" ? consumerHomePath(me) : homePathFor(me);
}

/**
 * Connexion Google : Clerk repasse par /sso-callback puis /redirection, sans
 * garder nos paramètres. L'espace choisi voyage donc dans sessionStorage.
 */
const LOGIN_SPACE_KEY = "withyou.loginSpace";

export function rememberLoginSpace(space: LoginSpace) {
  try {
    sessionStorage.setItem(LOGIN_SPACE_KEY, space);
  } catch {
    // Stockage indisponible : la redirection se fera sans contrôle d'espace.
  }
}

/** Lit puis oublie l'espace choisi avant une connexion Google (null pour une inscription). */
export function takeLoginSpace(): LoginSpace | null {
  try {
    const space = sessionStorage.getItem(LOGIN_SPACE_KEY);
    sessionStorage.removeItem(LOGIN_SPACE_KEY);
    return space === "consumer" || space === "pro" ? space : null;
  } catch {
    return null;
  }
}

export function fetchMe(token: string | null | undefined): Promise<Me> {
  return api.get<Me>("/users/me", { token: token ?? undefined });
}

/** Chacun arrive dans son espace après connexion. */
export async function homePath(token: string | null | undefined): Promise<string> {
  try {
    return homePathFor(await fetchMe(token));
  } catch (err) {
    console.error("Rôle du compte indisponible, redirection par défaut:", err);
    return "/accueil";
  }
}
