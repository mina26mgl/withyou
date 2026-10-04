import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/** Longueur maximale d'une description produit (même limite que le formulaire). */
export const DESCRIPTION_MAX_LENGTH = 600;

/** Ce que la fiche produit en cours contient : l'IA ne s'appuie que là-dessus. */
export class AiDescriptionDto {
  @IsString()
  @MaxLength(160)
  nom: string;

  /** Liste INCI telle que saisie (séparée par des virgules). */
  @IsString()
  @MaxLength(4000)
  inci: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  skinTypes: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  needs?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  categorie?: string;
}

function buildPrompt(dto: AiDescriptionDto): string {
  return [
    "Tu rédiges la description d'un produit de soin pour withyou, une application de beauté algérienne.",
    "Écris en français, au vouvoiement, sur un ton chaleureux, simple et honnête.",
    `Maximum ${DESCRIPTION_MAX_LENGTH - 50} caractères, en un ou deux courts paragraphes, sans titre, sans liste, sans emoji, sans guillemets.`,
    'Appuie-toi UNIQUEMENT sur les informations ci-dessous : explique ce que les ingrédients principaux apportent à la peau et pour quels types de peau le produit convient.',
    "N'invente aucun ingrédient, aucun chiffre, aucune certification ni aucun résultat. Aucune promesse médicale (pas de « guérit », « traite », « élimine définitivement »).",
    '',
    `Produit : ${dto.nom}`,
    dto.categorie ? `Catégorie : ${dto.categorie}` : null,
    `Ingrédients (INCI) : ${dto.inci}`,
    `Types de peau : ${dto.skinTypes.length ? dto.skinTypes.join(', ') : 'tous types de peau'}`,
    dto.needs?.length ? `Besoins ciblés : ${dto.needs.join(', ')}` : null,
    '',
    'Réponds uniquement avec le texte de la description.',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

/** Coupe proprement à la limite du formulaire, sur la dernière phrase complète. */
function fitToLimit(text: string): string {
  const clean = text.replace(/\s+\n/g, '\n').replace(/^["«\s]+|["»\s]+$/g, '').trim();
  if (clean.length <= DESCRIPTION_MAX_LENGTH) return clean;
  const cut = clean.slice(0, DESCRIPTION_MAX_LENGTH);
  const lastSentence = cut.lastIndexOf('.');
  return lastSentence > DESCRIPTION_MAX_LENGTH / 2 ? cut.slice(0, lastSentence + 1) : cut.trim();
}

/**
 * Description produit rédigée par Gemini à partir des ingrédients et des types
 * de peau. La clé reste côté serveur (GEMINI_API_KEY) ; la marque relit et
 * modifie le texte avant d'enregistrer.
 */
@Injectable()
export class AiDescriptionService {
  private readonly logger = new Logger(AiDescriptionService.name);

  async generate(dto: AiDescriptionDto): Promise<{ description: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException("La rédaction par l'IA n'est pas configurée (GEMINI_API_KEY).");
    }
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(dto) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
          // Texte court : pas besoin de « réflexion », qui consommerait le budget de sortie.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(30_000),
    }).catch((err: unknown) => {
      this.logger.error(`Gemini injoignable: ${String(err)}`);
      throw new BadGatewayException("Le service de rédaction ne répond pas. Réessayez dans un instant.");
    });

    if (!res.ok) {
      this.logger.error(`Gemini a refusé la demande (${res.status}): ${(await res.text()).slice(0, 500)}`);
      throw new BadGatewayException("La rédaction par l'IA a échoué. Réessayez dans un instant.");
    }

    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text.trim()) {
      throw new BadGatewayException("L'IA n'a pas proposé de description. Réessayez.");
    }
    return { description: fitToLimit(text) };
  }
}
