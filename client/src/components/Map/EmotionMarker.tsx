import { GbairaiWithInteractions } from "@shared/schema";

interface EmotionMarkerProps {
  gbairai: GbairaiWithInteractions;
  onClick: () => void;
}

const emotionConfig = {
  joie: { color: '#F7C948', emoji: '😊' },
  colere: { color: '#E63946', emoji: '😠' },
  tristesse: { color: '#1D3557', emoji: '😢' },
  amour: { color: '#EF476F', emoji: '❤️' },
  suspens: { color: '#7209B7', emoji: '🤔' },
  calme: { color: '#06D6A0', emoji: '😌' },
  inclassable: { color: '#BDBDBD', emoji: '🤷' }
};

export function EmotionMarker({ gbairai, onClick }: EmotionMarkerProps) {
  const emotion = emotionConfig[gbairai.emotion as keyof typeof emotionConfig] || emotionConfig.inclassable;

  return (
    <div
      className="emotion-marker cursor-pointer transition-transform hover:scale-110"
      onClick={onClick}
      style={{
        width: '24px',
        height: '24px',
        backgroundColor: emotion.color,
        border: '2px solid white',
        borderRadius: '50%',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        animation: 'pulse 2s infinite'
      }}
    >
      {emotion.emoji}
    </div>
  );
}
