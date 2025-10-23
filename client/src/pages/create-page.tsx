import { MobileLayout } from "@/components/Common/MobileLayout";
import { GbairaiForm } from "@/components/Gbairai/GbairaiForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function CreatePage() {
  return (
    <MobileLayout className="bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-yellow-700 dark:text-white hover:bg-yellow-200 dark:hover:bg-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold ml-4 text-yellow-800 dark:text-white">Nouveau Gbairai</h1>
        </div>

        {/* Form */}
        <div className="bg-white/90 dark:bg-gray-800 rounded-xl p-6 shadow-lg backdrop-blur-sm border border-yellow-200 dark:border-gray-700">
          <GbairaiForm />
        </div>
      </div>
    </MobileLayout>
  );
}