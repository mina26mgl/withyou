const SparkleStar = ({ color = "#1A4F21" }: { color?: string }) => (
  <svg
    width="40"            // Largeur du SVG
    height="40"           // Hauteur du SVG
    viewBox="0 0 40 40"   // Espace de coordonnées
    fill="none"           // Pas de fond par défaut
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "inline-block", verticalAlign: "middle" }} // Pour un alignement correct avec le texte
  >
    {/* --- L'Étoile Centrale --- */}
    <path
      d="M20 11.5L22.5 16.5L28 17.3L24 21.2L25 26.7L20 24.1L15 26.7L16 21.2L12 17.3L17.5 16.5L20 11.5Z"
      stroke={color}
      strokeWidth="2"       // Épaisseur des traits
      strokeLinecap="round" // Bords arrondis pour un rendu plus doux
      strokeLinejoin="round" // Coins arrondis
    />

    {/* --- Les Rayons Scintillants --- */}
    {/* Rayons Cardinaux (Haut, Bas, Gauche, Droite) */}
    <line x1="20" y1="5" x2="20" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="20" y1="32" x2="20" y2="35" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="5" y1="20" x2="8" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="32" y1="20" x2="35" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />

    {/* Rayons Diagonaux */}
    <line x1="9.5" y1="9.5" x2="11.5" y2="11.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="32.5" y1="9.5" x2="30.5" y2="11.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="9.5" y1="30.5" x2="11.5" y2="28.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="32.5" y1="30.5" x2="30.5" y2="28.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default SparkleStar;