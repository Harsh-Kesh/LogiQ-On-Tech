import { prisma } from './prisma';
import { nextDocumentNumber } from './document-sequences';

export type DispatchStatus =
  | 'PENDING'
  | 'ALLOCATED'
  | 'PICKING'
  | 'PICKED'
  | 'PACKING'
  | 'PACKED'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'DELIVERY_EXCEPTION'
  | 'ON_HOLD'
  | 'RETURNED'
  | 'CANCELLED';

export const DISPATCH_STATUS_FLOW: DispatchStatus[] = [
  'PENDING',
  'ALLOCATED',
  'PICKING',
  'PICKED',
  'PACKING',
  'PACKED',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
];

export interface DispatchNoteLine {
  id: string;
  itemCode: string;
  itemName: string;
  orderedQty: number;
  pickedQty: number;
  dispatchQty: number;
  deliveredQty: number;
  // Units confirmed damaged on arrival, out of deliveredQty — captured at delivery
  // confirmation, separate from condition so partial-damage quantities are exact.
  damagedQty?: number;
}

export interface DispatchNote {
  id: string;
  dispatchNumber: string; // DSP-YYYY-#####
  salesOrderNumber: string;
  salesOrderId?: string;
  customerName: string;
  customerAddress: string;
  warehouseCode: string;
  warehouseName?: string;
  status: DispatchStatus;
  lines: DispatchNoteLine[];
  dispatchDate?: string;
  carrier?: string;
  // Tracking number lives on the Transport Cost claim, not here — several dispatch
  // notes from the same warehouse can go out as one consolidated shipment under one
  // tracking number, so it's a fact about that shipment (the claim), not any single
  // dispatch note.
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  comments?: string;
  receiverName?: string;
  podReference?: string;
  // Set when a vendor/warehouse reports the shipment can't be completed after it has
  // already left the warehouse (DELIVERY_EXCEPTION) — the reason is mandatory so there's
  // always a record of why.
  rejectionReason?: string;
  attachment?: {
    fileName: string;
    fileData?: string;
    fileType?: string;
    uploadedAt?: string;
    receiverName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const DN_INCLUDE = { lines: true } as const;
type DispatchNoteRow = Awaited<ReturnType<typeof prisma.dispatchNote.findFirstOrThrow<{ include: typeof DN_INCLUDE }>>>;

function toLine(row: DispatchNoteRow['lines'][number]): DispatchNoteLine {
  return {
    id: row.id,
    itemCode: row.itemCode,
    itemName: row.itemName,
    orderedQty: row.orderedQty,
    pickedQty: row.pickedQty,
    dispatchQty: row.dispatchQty,
    deliveredQty: row.deliveredQty,
    damagedQty: row.damagedQty,
  };
}

function toDispatchNote(row: DispatchNoteRow): DispatchNote {
  return {
    id: row.id,
    dispatchNumber: row.dispatchNumber,
    salesOrderNumber: row.salesOrderNumber,
    salesOrderId: row.salesOrderId ?? undefined,
    customerName: row.customerName,
    customerAddress: row.customerAddress,
    warehouseCode: row.warehouseCode,
    warehouseName: row.warehouseName ?? undefined,
    status: row.status as DispatchStatus,
    lines: (row.lines || []).map(toLine),
    dispatchDate: row.dispatchDate?.toISOString(),
    carrier: row.carrier ?? undefined,
    expectedDeliveryDate: row.expectedDeliveryDate?.toISOString(),
    actualDeliveryDate: row.actualDeliveryDate?.toISOString(),
    comments: row.comments ?? undefined,
    receiverName: row.receiverName ?? undefined,
    podReference: row.podReference ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
    attachment: row.attachmentFileName
      ? {
          fileName: row.attachmentFileName,
          fileData: row.attachmentFileData ?? undefined,
          fileType: row.attachmentFileType ?? undefined,
          uploadedAt: row.attachmentUploadedAt?.toISOString(),
          receiverName: row.receiverName ?? undefined,
        }
      : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadDispatchNotes(): Promise<DispatchNote[]> {
  const rows = await prisma.dispatchNote.findMany({ include: DN_INCLUDE, orderBy: { createdAt: 'desc' } });
  return rows.map(toDispatchNote);
}

// BR-012 atomic number allocation.
export async function createDispatchNote(input: Omit<DispatchNote, 'id' | 'dispatchNumber' | 'createdAt' | 'updatedAt' | 'status'> & { status?: DispatchStatus }): Promise<DispatchNote> {
  const dispatchNumber = await nextDocumentNumber('DN');
  const row = await prisma.dispatchNote.create({
    data: {
      dispatchNumber,
      salesOrderNumber: input.salesOrderNumber,
      salesOrderId: input.salesOrderId,
      customerName: input.customerName,
      customerAddress: input.customerAddress,
      warehouseCode: input.warehouseCode,
      warehouseName: input.warehouseName,
      // Starts at ALLOCATED, not READY_FOR_DISPATCH — picking and dispatch are separate,
      // vendor-performed steps that still need to happen before this is actually ready.
      status: input.status || 'ALLOCATED',
      dispatchDate: input.dispatchDate ? new Date(input.dispatchDate) : null,
      carrier: input.carrier,
      expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
      actualDeliveryDate: input.actualDeliveryDate ? new Date(input.actualDeliveryDate) : null,
      comments: input.comments,
      receiverName: input.receiverName,
      podReference: input.podReference,
      rejectionReason: input.rejectionReason,
      attachmentFileName: input.attachment?.fileName,
      attachmentFileData: input.attachment?.fileData,
      attachmentFileType: input.attachment?.fileType,
      attachmentUploadedAt: input.attachment?.uploadedAt ? new Date(input.attachment.uploadedAt) : undefined,
      lines: {
        create: input.lines.map((l) => ({
          itemCode: l.itemCode,
          itemName: l.itemName,
          orderedQty: l.orderedQty,
          pickedQty: l.pickedQty,
          dispatchQty: l.dispatchQty,
          deliveredQty: l.deliveredQty,
          damagedQty: l.damagedQty || 0,
        })),
      },
    },
    include: DN_INCLUDE,
  });
  return toDispatchNote(row);
}

export async function updateDispatchNote(id: string, patch: Partial<DispatchNote>): Promise<DispatchNote | null> {
  const data: any = {};
  (['salesOrderNumber', 'salesOrderId', 'customerName', 'customerAddress', 'warehouseCode', 'warehouseName', 'status', 'carrier', 'comments', 'receiverName', 'podReference', 'rejectionReason'] as const).forEach((k) => {
    if (patch[k] !== undefined) data[k] = patch[k];
  });
  if (patch.dispatchDate !== undefined) data.dispatchDate = patch.dispatchDate ? new Date(patch.dispatchDate) : null;
  if (patch.expectedDeliveryDate !== undefined) data.expectedDeliveryDate = patch.expectedDeliveryDate ? new Date(patch.expectedDeliveryDate) : null;
  if (patch.actualDeliveryDate !== undefined) data.actualDeliveryDate = patch.actualDeliveryDate ? new Date(patch.actualDeliveryDate) : null;
  if (patch.attachment !== undefined) {
    data.attachmentFileName = patch.attachment?.fileName ?? null;
    data.attachmentFileData = patch.attachment?.fileData ?? null;
    data.attachmentFileType = patch.attachment?.fileType ?? null;
    data.attachmentUploadedAt = patch.attachment?.uploadedAt ? new Date(patch.attachment.uploadedAt) : null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.dispatchNote.update({ where: { id }, data });

      if (patch.lines) {
        for (const line of patch.lines) {
          if (!line.id) continue;
          await tx.dispatchNoteLine.update({
            where: { id: line.id },
            data: {
              pickedQty: line.pickedQty,
              dispatchQty: line.dispatchQty,
              deliveredQty: line.deliveredQty,
              damagedQty: line.damagedQty,
            },
          }).catch(() => {});
        }
      }
    });
  } catch {
    return null;
  }

  const row = await prisma.dispatchNote.findUnique({ where: { id }, include: DN_INCLUDE });
  return row ? toDispatchNote(row) : null;
}
