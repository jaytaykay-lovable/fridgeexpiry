import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { format, differenceInDays } from 'date-fns';
import { AlertTriangle, Check, Trash2 } from 'lucide-react';
import type { FoodItem } from '@/types/food';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { getThumbnailPath } from '@/lib/imageUtils';

interface FoodCardProps {
  item: FoodItem;
  onConsume: (id: string) => void;
  onWaste: (id: string) => void;
  onClick: (item: FoodItem) => void;
}

export default function FoodCard({ item, onConsume, onWaste, onClick }: FoodCardProps) {
  const [offset, setOffset] = useState(0);
  // Use thumbnail version if it's a storage path (not a legacy full URL)
  const thumbPath = item.image_url && !item.image_url.startsWith('http')
    ? getThumbnailPath(item.image_url)
    : item.image_url;
  const thumbnailUrl = useSignedUrl(thumbPath);
  // Fallback to original if thumbnail fails
  const originalUrl = useSignedUrl(item.image_url);
  const imageUrl = thumbnailUrl || originalUrl;
  const [swiping, setSwiping] = useState(false);
  const [dismissed, setDismissed] = useState<'left' | 'right' | null>(null);
  const absOffset = Math.abs(offset);
  const swipeThreshold = 120;
  const isSwipeActive = absOffset > 8;
  const canSwipeRight = item.status !== 'consumed';
  const canSwipeLeft = item.status !== 'wasted';

  const daysLeft = differenceInDays(new Date(item.expiry_date), new Date());
  const isExpired = daysLeft < 0;
  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 2;

  const handlers = useSwipeable({
    onSwiping: (e) => {
      // Only treat movement as swipe when horizontal intent is clearly stronger than vertical scrolling.
      const isHorizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.35;
      if (!isHorizontalIntent || Math.abs(e.deltaX) < 14) {
        return;
      }

      const isRightSwipe = e.deltaX > 0;
      if ((isRightSwipe && !canSwipeRight) || (!isRightSwipe && !canSwipeLeft)) {
        return;
      }

      setSwiping(true);
      setOffset(e.deltaX);
    },
    onSwipedLeft: () => {
      if (!canSwipeLeft) {
        setOffset(0);
        setSwiping(false);
        return;
      }

      if (Math.abs(offset) >= swipeThreshold) {
        setDismissed('left');
        setTimeout(() => onWaste(item.id), 300);
      } else {
        setOffset(0);
        setSwiping(false);
      }
    },
    onSwipedRight: () => {
      if (!canSwipeRight) {
        setOffset(0);
        setSwiping(false);
        return;
      }

      if (Math.abs(offset) >= swipeThreshold) {
        setDismissed('right');
        setTimeout(() => onConsume(item.id), 300);
      } else {
        setOffset(0);
        setSwiping(false);
      }
    },
    trackMouse: false,
    trackTouch: true,
    delta: 26,
    preventScrollOnSwipe: false,
  });

  const expiryLabel = isExpired
    ? `Expired ${Math.abs(daysLeft)}d ago`
    : daysLeft === 0
      ? 'Expires today'
      : `${daysLeft}d left`;

  return (
    <div className="relative overflow-hidden rounded-xl animate-fade-in">
      {/* Swipe backgrounds */}
      <div
        className={`absolute inset-0 ${offset >= 0 ? 'swipe-bg-consume' : 'swipe-bg-waste'}`}
        style={{ opacity: isSwipeActive ? Math.min(absOffset / swipeThreshold, 1) : 0 }}
      >
        <div className={`h-full w-full flex items-center ${offset >= 0 ? 'justify-start pl-5' : 'justify-end pr-5'}`}>
          {offset >= 0 ? (
            <Check className="text-success-foreground" size={24} />
          ) : (
            <Trash2 className="text-destructive-foreground" size={24} />
          )}
        </div>
      </div>

      {/* Card */}
      <div
        {...handlers}
        onClick={() => !swiping && onClick(item)}
        className={`food-card relative z-10 flex items-center gap-3 p-3 cursor-pointer ${item.is_flagged ? 'food-card-flagged' : ''
          } ${dismissed === 'left' ? 'animate-slide-left' : ''} ${dismissed === 'right' ? 'animate-slide-right' : ''
          }`}
        style={{
          transform: dismissed ? undefined : `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* Thumbnail */}
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground text-lg">
              🍽️
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm truncate">{item.name}</h3>
            {item.is_flagged && (
              <AlertTriangle size={14} className="text-warning flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="category-badge">{item.category}</span>
          </div>
        </div>

        {/* Expiry */}
        <div className="text-right flex-shrink-0">
          <p
            className={`text-xs font-semibold ${isExpired
              ? 'text-destructive'
              : isExpiringSoon
                ? 'text-warning'
                : 'text-muted-foreground'
              }`}
          >
            {expiryLabel}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {format(new Date(item.expiry_date), 'MMM d')}
          </p>
        </div>
      </div>
    </div>
  );
}
