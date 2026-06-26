import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminReview } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { AdminGuard } from "./guard";
import { AdminNav } from "./nav";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Star, Trash2, MessageSquare, ExternalLink } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={13} fill={s <= rating ? "currentColor" : "none"} className={s <= rating ? "text-amber-400" : "text-gray-300"} />
      ))}
    </div>
  );
}

function ReviewsInner() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<AdminReview | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => adminApi.listReviews(),
  });

  const del = useMutation({
    mutationFn: (id: number) => adminApi.deleteReview(id),
    onSuccess: () => {
      toast.success("Review deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviews = data?.reviews ?? [];

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <AdminNav />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center"><MessageSquare size={22} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
            <p className="text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? "s" : ""} across all products · newest first</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading reviews…</div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center">
              <Star size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No reviews yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {reviews.map((r) => (
                <li key={r.id} className="p-4 md:p-5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm flex-shrink-0">
                    {r.reviewerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{r.reviewerName}</span>
                      <Stars rating={r.rating} />
                      {r.createdAt && (
                        <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 break-words">{r.comment}</p>
                    <div className="mt-1.5">
                      <Link href={`/product/${r.productId}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink size={11} /> {r.productName}
                      </Link>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 flex-shrink-0"
                    title="Delete review"
                    onClick={() => setTarget(r)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              The review by <span className="font-semibold">{target?.reviewerName}</span> on {target?.productName} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => target && del.mutate(target.id)} disabled={del.isPending}>
              {del.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminReviews() {
  return (
    <AdminGuard>
      <ReviewsInner />
    </AdminGuard>
  );
}
