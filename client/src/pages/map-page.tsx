import { MobileLayout } from "@/components/Common/MobileLayout";
import { InteractiveMap } from "@/components/Map/InteractiveMap";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function MapPage() {
  return (
    <MobileLayout>
      <div className="h-full bg-white rounded-lg overflow-hidden relative">
        {/* Header */}
        <div className="absolute top-2 left-2 z-10 flex items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="bg-white/80 backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <span className="ml-2 text-sm font-medium bg-white/80 backdrop-blur-sm px-2 py-1 rounded">
            Carte des émotions
          </span>
        </div>

        {/* Map Container */}
        <div className="w-full h-full">
          <InteractiveMap />
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <h3 className="text-sm font-semibold mb-2 text-gray-800">Légende des émotions</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-700">Joie</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-700">Colère</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Tristesse</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Calme</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                <span className="text-gray-700">Amour</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Peur</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
