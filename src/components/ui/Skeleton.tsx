import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[#2A2A2D]',
        className
      )}
    />
  );
}

interface GallerySkeletonProps {
  thumbnailSize: 'small' | 'medium' | 'large';
  count?: number;
}

export function GallerySkeleton({ thumbnailSize, count = 12 }: GallerySkeletonProps) {
  const getGridClasses = () => {
    const baseClasses = 'grid gap-6';
    
    switch (thumbnailSize) {
      case 'small':
        return `${baseClasses} grid-cols-3 sm:grid-cols-4 lg:grid-cols-5`;
      case 'medium':
        return `${baseClasses} grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
      case 'large':
        return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`;
      default:
        return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
    }
  };

  const getHeightClasses = () => {
    switch (thumbnailSize) {
      case 'small':
        return 'h-32 sm:h-36 lg:h-40';
      case 'medium':
        return 'h-48 sm:h-52 lg:h-56';
      case 'large':
        return 'h-56 sm:h-60 lg:h-64';
      default:
        return 'h-48 sm:h-52 lg:h-56';
    }
  };

  const showCaptions = thumbnailSize !== 'small';

  return (
    <div className="space-y-12">
      {/* Date header skeleton */}
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        
        <div className={getGridClasses()}>
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              className={`bg-[#1A1A1D] border border-[#2A2A2D] rounded-2xl overflow-hidden flex flex-col ${getHeightClasses()}`}
            >
              {/* Image skeleton */}
              <div className="relative flex-1">
                <Skeleton className="absolute inset-0" />
              </div>
              
              {/* Caption skeleton */}
              {showCaptions && (
                <div className="p-3 flex-shrink-0 min-h-[5rem] space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex justify-between mt-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function UserInfoSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-32 rounded-full" />
      <Skeleton className="h-10 w-24 rounded-full" />
    </div>
  );
}