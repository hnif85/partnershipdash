import { PartnerCRMRow } from "@/lib/partnerActivations";

interface ClientWrapperProps {
  partnerCRMData: PartnerCRMRow[];
  onRowClick: (partner: PartnerCRMRow) => void;
}

export default function ClientWrapper({ partnerCRMData, onRowClick }: ClientWrapperProps) {
  return (
    <tbody>
      {partnerCRMData.map((partner, index) => (
        <tr
          key={partner.no}
          onClick={() => onRowClick(partner)}
          className={`border-b border-zinc-100 ${index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-zinc-50 hover:bg-blue-50'} cursor-pointer transition-colors`}
        >
          <td className="py-3 px-2 text-zinc-900 font-medium">{partner.no}</td>
          <td className="py-3 px-2 text-zinc-900 font-medium">{partner.partner}</td>
          <td className="py-3 px-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              partner.tipe.toLowerCase().includes('goverment') || partner.tipe.toLowerCase().includes('government')
                ? 'bg-blue-100 text-blue-800'
                : partner.tipe.toLowerCase().includes('association')
                ? 'bg-green-100 text-green-800'
                : partner.tipe.toLowerCase().includes('foundation')
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {partner.tipe}
            </span>
          </td>
          <td className="py-3 px-2 text-zinc-700">{partner.kontak || '-'}</td>
          <td className="py-3 px-2 text-zinc-700">{partner.picMw || '-'}</td>
          <td className="py-3 px-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              partner.status.toLowerCase().includes('signed') || partner.status.toLowerCase().includes('done') || partner.status.toLowerCase().includes('sudah')
                ? 'bg-green-100 text-green-800'
                : partner.status.toLowerCase().includes('onhold') || partner.status.toLowerCase().includes('menunggu')
                ? 'bg-yellow-100 text-yellow-800'
                : partner.status.toLowerCase().includes('fu') || partner.status.toLowerCase().includes('follow')
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {partner.status || '-'}
            </span>
          </td>
          <td className="py-3 px-2 text-zinc-700 max-w-xs truncate" title={partner.nextToDo}>
            {partner.nextToDo || '-'}
          </td>
          <td className="py-3 px-2 text-center">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const menu = e.currentTarget.nextElementSibling as HTMLElement;
                  if (menu) {
                    menu.classList.toggle('hidden');
                  }
                }}
                className="text-zinc-400 hover:text-zinc-600 text-lg p-1 rounded hover:bg-zinc-100"
                title="Actions"
              >
                ⋯
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-white border border-zinc-200 rounded-md shadow-lg z-10 hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick(partner);
                    (e.currentTarget.parentElement as HTMLElement).classList.add('hidden');
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );
}
