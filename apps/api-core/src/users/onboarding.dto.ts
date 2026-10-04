import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Choix des écrans du quiz de peau (identifiants des pages /quiz, /quiz2, /quiz3). */
export const TYPES_PEAU = ['brillante', 'tendue', 'mixte', 'equilibree'] as const;
/** Choix de /quiz2 : trois au plus, ou « rien » seul. */
export const PREOCCUPATIONS = ['boutons', 'taches', 'ridules', 'pores', 'tiraillements', 'rougeurs', 'rien'] as const;
export const MAX_PREOCCUPATIONS = 3;
/** « Avant de te conseiller, deux choses à vérifier » : aucune, une ou plusieurs. */
export const PRECAUTIONS = ['traitement-medical', 'actif-fort', 'grossesse'] as const;
export const ROUTINES_ACTUELLES = ['zero', 'basiques', 'routine-inefficace', 'regulier'] as const;
/** « Tu es… » de /onboarding (consomateur.gender). */
export const GENRES = ['homme', 'femme'] as const;

/**
 * Une étape de l'onboarding cliente : chaque écran n'envoie que ce qu'il a
 * demandé, pour qu'une cliente qui s'arrête en route retrouve ses réponses.
 */
export class UpdateOnboardingDto {
  /** Nom complet saisi sur /onboarding ; le premier mot devient le prénom. */
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Indiquez votre nom.' })
  @MaxLength(120)
  nomComplet?: string;

  @IsOptional()
  @IsIn(GENRES)
  genre?: (typeof GENRES)[number];

  /** « Tu as quel âge ? » de /quiz-age, au format AAAA-MM-JJ (consomateur.birth_date). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date de naissance invalide.' })
  dateNaissance?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(TYPES_PEAU.length)
  @IsIn(TYPES_PEAU, { each: true })
  typePeau?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PREOCCUPATIONS)
  @IsIn(PREOCCUPATIONS, { each: true })
  preoccupations?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PRECAUTIONS.length)
  @IsIn(PRECAUTIONS, { each: true })
  precautions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ROUTINES_ACTUELLES.length)
  @IsIn(ROUTINES_ACTUELLES, { each: true })
  routineActuelle?: string[];

  /** 0 « je ne sais pas » → 5 « très sensible » (curseur de /quiz5). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  sensibilite?: number;

  /** Dernier écran du quiz : l'onboarding est terminé, la cliente arrivera sur l'accueil. */
  @IsOptional()
  @IsBoolean()
  termine?: boolean;
}
