import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, Trash, ArrowRight } from "lucide-react";

export default function RecentActivity() {
  const { data: extractions, isLoading } = useQuery({
    queryKey: ['/api/extractions'],
  });

  if (isLoading) {
    return (
      <Card className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-white">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-warning text-white">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge className="bg-slate-200 text-slate-500">Pending</Badge>;
    }
  };

  return (
    <Card className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-900">Recent Extractions</CardTitle>
          <Button variant="link" className="text-primary hover:text-blue-700 text-sm font-medium">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!extractions?.extractions?.length ? (
          <div className="text-center py-8">
            <p className="text-slate-500">No extractions yet. Upload some PDFs to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Extraction Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Documents</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Keywords</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {extractions.extractions.map((extraction: any) => (
                  <tr key={extraction.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{extraction.name}</div>
                      <div className="text-sm text-slate-500">ID: EXT-{extraction.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700">
                        {extraction.extractionDocuments?.length || 0} PDFs
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-600 max-w-32 truncate">
                        {extraction.keywords}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700">
                        {new Date(extraction.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(extraction.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-slate-400 hover:text-primary transition-colors"
                          disabled={extraction.status !== 'completed'}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-slate-400 hover:text-error transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
