import React from "react";
import { useState, useEffect, useCallback } from "react";
import { secureApi } from "@/lib/secure-api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Akhbar {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  target_grades: string[];
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UseAkhbarOptions {
  filterByGrade?: string;
  onlyPublished?: boolean;
}

export function useAkhbar(options: UseAkhbarOptions = {}) {
  const [akhbarList, setAkhbarList] = useState<Akhbar[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAkhbar = useCallback(async () => {
    const { data, error } = await secureApi.select<Akhbar>('akhbar');
    if (!error && data) {
      let filtered = data;
      
      // Filter by published status
      if (options.onlyPublished) {
        filtered = filtered.filter(a => a.is_published);
      }
      
      // Filter by grade
      if (options.filterByGrade) {
        filtered = filtered.filter(a => 
          a.target_grades.length === 0 || a.target_grades.includes(options.filterByGrade!)
        );
      }
      
      setAkhbarList(filtered);
    }
    setLoading(false);
  }, [options.filterByGrade, options.onlyPublished]);

  useEffect(() => {
    fetchAkhbar();
  }, [fetchAkhbar]);

  const createAkhbar = async (
    title: string,
    content: string,
    imageUrl: string | null,
    targetGrades: string[],
    isPublished: boolean,
    createdBy: string
  ) => {
    const { error } = await secureApi.insert('akhbar', {
      title,
      content,
      image_url: imageUrl,
      target_grades: targetGrades,
      is_published: isPublished,
      created_by: createdBy,
    });

    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return false;
    }

    toast({ title: "موفق", description: "خبر با موفقیت ایجاد شد" });
    fetchAkhbar();
    return true;
  };

  const updateAkhbar = async (
    id: string,
    updates: Partial<Omit<Akhbar, 'id' | 'created_at' | 'updated_at' | 'created_by'>>
  ) => {
    const { error } = await secureApi.update('akhbar', id, updates);

    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return false;
    }

    toast({ title: "موفق", description: "خبر با موفقیت ویرایش شد" });
    fetchAkhbar();
    return true;
  };

  const deleteAkhbar = async (id: string) => {
    const { error } = await secureApi.delete('akhbar', id);

    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return false;
    }

    toast({ title: "حذف شد", description: "خبر با موفقیت حذف شد" });
    fetchAkhbar();
    return true;
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `akhbar-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch {
      toast({ title: "خطا", description: "آپلود تصویر ناموفق بود", variant: "destructive" });
      return null;
    }
  };

  return {
    akhbarList,
    loading,
    createAkhbar,
    updateAkhbar,
    deleteAkhbar,
    uploadImage,
    refetch: fetchAkhbar,
  };
}

// Helper to render bold text (**text** -> <strong>text</strong>)
export function renderFormattedText(text: string): React.ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
