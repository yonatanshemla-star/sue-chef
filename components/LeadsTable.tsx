"use client";

import { useState, useCallback } from "react";
import { Phone, Clock, Loader2, Save, Image as ImageIcon } from "lucide-react";
import type { Lead } from "@/utils/storage";

interface LeadsTableProps {
  leads: Lead[];
  onLeadUpdate: (id: string, updates: Partial<Lead>) => void;
}

export default function LeadsTable({ leads, onLeadUpdate }: LeadsTableProps) {
  const [processingImageId, setProcessingImageId] = useState<string | null>(null);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>, leadId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
       if (items[i].type.indexOf("image") !== -1) {
           e.preventDefault();
           const blob = items[i].getAsFile();
           if (!blob) continue;

           setProcessingImageId(leadId);

           const reader = new FileReader();
           reader.onload = async (event) => {
               const base64 = event.target?.result as string;
               try {
                   const res = await fetch("/api/vision", {
                       method: "POST",
                       headers: { "Content-Type": "application/json" },
                       body: JSON.stringify({ imageBase64: base64 })
                   });
                   const result = await res.json();
                   
                   if (result.success && result.data) {
                       const { name, phone } = result.data;
                       const updates: Partial<Lead> = {};
                       if (name) updates.clientName = name;
                       if (phone) updates.phone = phone;
                       
                       if (Object.keys(updates).length > 0) {
                           onLeadUpdate(leadId, updates);
                       }
                   } else {
                       alert("לא זיהינו טקסט בתמונה");
                   }
               } catch (err) {
                   console.error("OCR Error:", err);
                   alert("שגיאה בניתוח התמונה");
               } finally {
                   setProcessingImageId(null);
               }
           };
           reader.readAsDataURL(blob);
           break; // only process the first image
       }
    }
  }, [onLeadUpdate]);

  const formatDate = (dateString: string | null) => {
      if (!dateString) return "-";
      return new Intl.DateTimeFormat("he-IL", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(dateString));
  };

  if (leads.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                 <Phone className="w-8 h-8 text-gray-300" />
             </div>
             <p>אין לידים כרגע</p>
        </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <table className="w-full text-sm text-right">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="px-6 py-4 font-bold w-1/5">שם וטלפון (הדבק תמונה)</th>
            <th className="px-4 py-4 font-bold w-32 whitespace-nowrap">תאריך אחרון</th>
            <th className="px-4 py-4 font-bold w-32">סטטוס</th>
            <th className="px-4 py-4 font-bold w-32">חזור בתאריך</th>
            <th className="px-4 py-4 font-bold w-1/4">הערות כלליות</th>
            <th className="px-6 py-4 font-bold w-1/4">סיכום שיחה לייב</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
              
              {/* 1. Name & Phone (Support image paste) */}
              <td className="px-6 py-3 relative">
                 <div 
                    className={`p-3 rounded-lg border-2 border-dashed transition-all ${
                        processingImageId === lead.id 
                        ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' 
                        : 'border-transparent hover:border-indigo-200'
                    }`}
                    onPaste={(e) => handlePaste(e, lead.id)}
                 >
                     {processingImageId === lead.id ? (
                         <div className="flex items-center gap-2 text-indigo-600 font-medium">
                             <Loader2 className="w-4 h-4 animate-spin" />
                             סורק תמונה...
                         </div>
                     ) : (
                         <div className="flex flex-col gap-2">
                            <input 
                              type="text" 
                              value={lead.clientName} 
                              onChange={(e) => onLeadUpdate(lead.id, { clientName: e.target.value })}
                              className="font-bold text-base bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 placeholder:text-gray-300"
                              placeholder="שם הלקוח"
                            />
                            <div className="flex items-center gap-2 text-gray-500">
                               <Phone className="w-3.5 h-3.5" />
                               <input 
                                  type="text" 
                                  value={lead.phone || ''} 
                                  onChange={(e) => onLeadUpdate(lead.id, { phone: e.target.value })}
                                  className="text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 flex-1 placeholder:text-gray-300"
                                  placeholder="מספר טלפון"
                                  dir="ltr"
                               />
                               {lead.phone && (
                                   <a href={`tel:${lead.phone}`} title="חייג" className="text-indigo-500 hover:bg-indigo-100 p-1 rounded-md transition-colors">
                                       <Phone className="w-4 h-4" />
                                   </a>
                               )}
                            </div>
                         </div>
                     )}
                 </div>
              </td>

              {/* 2. Last Contact Date */}
              <td className="px-4 py-3 align-top whitespace-nowrap text-gray-500">
                  <div className="flex items-center gap-1.5 mt-2">
                     <Clock className="w-3.5 h-3.5 opacity-70" />
                     {formatDate(lead.lastContacted || lead.createdAt)}
                  </div>
              </td>

              {/* 3. Status */}
              <td className="px-4 py-3 align-top">
                <select 
                  value={lead.status || 'חדש'} 
                  onChange={(e) => onLeadUpdate(lead.id, { status: e.target.value as any })}
                  className={`mt-1 text-xs font-bold rounded-lg px-2 py-1.5 outline-none border cursor-pointer w-full text-center ${
                      lead.status === 'סגור' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      lead.status === 'לא ענה' ? 'bg-red-50 text-red-700 border-red-200' :
                      lead.status === 'בבדיקה' || lead.status === 'מחכה לחתימה' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}
                >
                  <option value="חדש">חדש</option>
                  <option value="מחכה לחתימה">במו"מ / חתימה</option>
                  <option value="לא ענה">לא ענה</option>
                  <option value="בבדיקה">בבדיקה</option>
                  <option value="סגור">סגור / אבוד</option>
                </select>
              </td>

              {/* 4. Follow-up Date */}
              <td className="px-4 py-3 align-top">
                  <input 
                     type="datetime-local" 
                     value={lead.followUpDate ? new Date(lead.followUpDate).toISOString().slice(0, 16) : ''}
                     onChange={(e) => onLeadUpdate(lead.id, { followUpDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                     className="mt-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-xs w-full text-gray-600 outline-none focus:border-indigo-400"
                  />
              </td>

              {/* 5. General Notes */}
              <td className="px-4 py-3 align-top">
                  <textarea 
                     value={lead.generalNotes || ''}
                     onChange={(e) => onLeadUpdate(lead.id, { generalNotes: e.target.value })}
                     placeholder="הערות לגבי הלקוח..."
                     className="w-full h-full min-h-[80px] text-sm resize-none bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent hover:border-gray-200 focus:border-indigo-300 rounded-lg p-2 transition-all outline-none"
                  />
              </td>

              {/* 6. Live Call Notes */}
              <td className="px-6 py-3 align-top bg-gradient-to-r from-yellow-50/30 to-transparent dark:from-yellow-900/10">
                  <textarea 
                     value={lead.liveCallNotes || ''}
                     onChange={(e) => onLeadUpdate(lead.id, { liveCallNotes: e.target.value })}
                     placeholder="הקלד תוך כדי שיחה..."
                     className="w-full h-full min-h-[80px] text-sm resize-none bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-yellow-200 focus:border-yellow-400 rounded-lg p-2 transition-all outline-none"
                  />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
