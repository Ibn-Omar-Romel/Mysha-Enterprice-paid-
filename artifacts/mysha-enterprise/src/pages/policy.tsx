import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ChevronRight } from "lucide-react";

interface PolicyDoc { slug: string; title: string; content: string; updatedAt?: string | null }

export default function PolicyPage() {
  const { slug } = useParams();
  const { data, isLoading, error } = useQuery<PolicyDoc>({
    queryKey: ["policy", slug],
    queryFn: async () => {
      const res = await fetch(`/api/policies/${slug}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!slug,
    retry: false,
  });

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-primary">Home</Link>
          <ChevronRight size={13} />
          <span className="text-gray-800 font-medium">{data?.title ?? "Policy"}</span>
        </nav>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
          {isLoading ? (
            <div className="space-y-3"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
          ) : error || !data ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3"><FileText size={26} /></div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Policy not found</h1>
              <p className="text-sm text-gray-500 mb-5">This policy doesn't exist or isn't available right now.</p>
              <Link href="/"><Button variant="outline">Back to Home</Button></Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{data.title}</h1>
              {data.content.trim() ? (
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed">{data.content}</div>
              ) : (
                <p className="text-gray-400">This policy will be updated soon.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
