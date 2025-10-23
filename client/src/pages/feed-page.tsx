import { Layout } from "@/components/Common/Layout";
import { GbairaiCard } from "@/components/Gbairai/GbairaiCard";
import { GbairaiForm } from "@/components/Gbairai/GbairaiForm";
import { useGbairais } from "@/hooks/useGbairais";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, TrendingUp, MapPin } from "lucide-react";
import { useState } from "react";

export default function FeedPage() {
  const { data: gbairais, isLoading } = useGbairais();
  const [showForm, setShowForm] = useState(false);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Feed Gbairai</h1>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-ivorian-orange hover:bg-orange-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Gbairai
          </Button>
        </div>

        {/* Publication Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Publier un Gbairai</CardTitle>
            </CardHeader>
            <CardContent>
              <GbairaiForm onSuccess={() => setShowForm(false)} />
            </CardContent>
          </Card>
        )}

        {/* Feed Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent">Récents</TabsTrigger>
            <TabsTrigger value="trending">
              <TrendingUp className="w-4 h-4 mr-2" />
              Tendances
            </TabsTrigger>
            <TabsTrigger value="nearby">
              <MapPin className="w-4 h-4 mr-2" />
              Près de moi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex space-x-4">
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              gbairais?.map((gbairai) => (
                <GbairaiCard key={gbairai.id} gbairai={gbairai} />
              ))
            )}
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            <Card className="p-4">
              <p className="text-gray-500 text-center">
                Fonctionnalité en cours de développement
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="nearby" className="space-y-4">
            <Card className="p-4">
              <p className="text-gray-500 text-center">
                Fonctionnalité en cours de développement
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
