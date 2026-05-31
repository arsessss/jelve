import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { secureApi } from "@/lib/secure-api";
import { customAuth } from "@/lib/auth";
import { renderFormattedText } from "@/hooks/use-akhbar";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedImage } from "@/components/SignedImage";

interface PishSabtenamData {
  id: string;
  unit_number: number;
  title: string;
  content: string;
  image_url: string | null;
  is_enabled: boolean;
}

const PishSabtenam = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PishSabtenamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageOpen, setImageOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const session = customAuth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const unitNum = parseInt(id || '', 10);
      if (isNaN(unitNum)) { setLoading(false); return; }
      const { data: items, error } = await secureApi.select<PishSabtenamData>('pish_sabtenam', { unit_number: unitNum });
      if (!error && items && items.length > 0) {
        setData(items[0]);
      }
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  if (!data || !data.is_enabled) {
    return (
      <div className="min-h-screen bg-background">
        <RoleBasedHeader />
        <main className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <Button variant="ghost" onClick={() => navigate("/student")} className="mb-6 gap-2">
              <ArrowLeft className="w-4 h-4" />
              بازگشت
            </Button>
            <Card className="p-12 border-2">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg">این بخش در حال حاضر فعال نیست</p>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-2xl" dir="rtl">
          <Button variant="ghost" onClick={() => navigate("/student")} className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4 rotate-180" />
            بازگشت
          </Button>
          
          <Card className="p-6 border-2 animate-fade-in">
            <h1 className="text-2xl font-bold mb-4">{data.title}</h1>
            
            {data.image_url && (
              <>
                <SignedImage
                  bucket="profile-pictures"
                  source={data.image_url}
                  alt={data.title}
                  className="w-full rounded-lg mb-6 cursor-pointer object-contain max-h-96"
                  onClick={() => setImageOpen(true)}
                />
                <Dialog open={imageOpen} onOpenChange={setImageOpen}>
                  <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
                    <SignedImage
                      bucket="profile-pictures"
                      source={data.image_url}
                      alt={data.title}
                      className="w-full h-full object-contain"
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}
            
            {data.content && (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {renderFormattedText(data.content)}
              </div>
            )}

            {!data.content && !data.image_url && (
              <p className="text-muted-foreground text-center py-8">محتوایی هنوز اضافه نشده است</p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PishSabtenam;
