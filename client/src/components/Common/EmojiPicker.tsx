import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

const emojis = [
  // Émotions de base
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
  "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
  "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
  "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
  "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯",
  "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐",
  "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈",
  "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾",
  
  // Gestes et mains
  "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙",
  "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "🖐", "✋",
  "🖖", "👏", "🙌", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪",
  
  // Cœurs et symboles d'amour
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
  "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️",
  
  // Objets et activités ivoiriens/africains
  "🌍", "🏖️", "🌴", "🌊", "☀️", "🌤️", "⛅", "🌦️", "🌧️", "⛈️",
  "🌀", "🌈", "🔥", "💧", "🌟", "⭐", "🌙", "🌞", "🍌", "🥭",
  "🍊", "🍋", "🥥", "🌽", "🍠", "🫘", "🍖", "🍗", "🍽️", "🥘",
  "🏠", "🏡", "🏘️", "🏙️", "🚗", "🚙", "🏍️", "🚲", "🛺", "⚽",
  "🏀", "🥁", "🎵", "🎶", "🎤", "🎸", "👨‍👩‍👧‍👦", "👪", "🎉", "🎊"
];

export function EmojiPicker({ onEmojiSelect, className = "" }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className={`emoji-picker-container ${className}`} ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="emoji-trigger"
        aria-label="Choisir un emoji"
      >
        <Smile className="w-5 h-5" />
      </button>
      
      {isOpen && (
        <div className="emoji-picker">
          <div className="emoji-picker-header">
            <span>Émojis</span>
          </div>
          <div className="emoji-grid">
            {emojis.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="emoji-button"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}