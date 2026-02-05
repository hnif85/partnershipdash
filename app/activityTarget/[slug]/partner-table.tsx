"use client";

import React, { useState } from "react";
import { PartnerCRMRow } from "@/lib/partnerActivations";
import ClientWrapper from "./client-wrapper";

function PartnerEditModal({ partner, isOpen, onClose, onSave }: {
  partner: PartnerCRMRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<PartnerCRMRow>) => void;
}) {
  const [formData, setFormData] = useState<Partial<PartnerCRMRow>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (partner) {
      setFormData({
        status: partner.status || '',
        nextToDo: partner.nextToDo || '',
        progressPercentage: partner.progressPercentage || 0,
        priority: partner.priority || 'medium',
        lastContactDate: partner.lastContactDate || '',
        expectedCompletionDate: partner.expectedCompletionDate || '',
        notes: partner.notes || '',
      });
    }
  }, [partner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/partners/${partner?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          updatedBy: 'User' // In real app, get from auth
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update partner');
      }

      const result = await response.json();
      onSave(result);
      onClose();
    } catch (error) {
      console.error('Error updating partner:', error);
      alert('Failed to update partner. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen || !partner) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0f172a]">{partner.partner}</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none"
              disabled={isSubmitting}
            >
              ×
            </button>
          </div>
          <p className="text-sm text-zinc-600 mt-1">
            {partner.tipe} • PIC: {partner.picMw || 'Belum ditentukan'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Progress Bar */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Progress ({formData.progressPercentage || 0}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progressPercentage || 0}
              onChange={(e) => handleInputChange('progressPercentage', parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
              disabled={isSubmitting}
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Priority</label>
            <select
              value={formData.priority || 'medium'}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3c88] focus:border-transparent"
              disabled={isSubmitting}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Status & Next To Do */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Status</label>
              <input
                type="text"
                value={formData.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3c88] focus:border-transparent"
                placeholder="Current status..."
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Next to Do</label>
              <input
                type="text"
                value={formData.nextToDo || ''}
                onChange={(e) => handleInputChange('nextToDo', e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3c88] focus:border-transparent"
                placeholder="Next action..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Last Contact Date</label>
              <input
                type="date"
                value={formData.lastContactDate || ''}
                onChange={(e) => handleInputChange('lastContactDate', e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3c88] focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Expected Completion</label>
              <input
                type="date"
                value={formData.expectedCompletionDate || ''}
                onChange={(e) => handleInputChange('expectedCompletionDate', e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3c88] focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3c88] focus:border-transparent resize-none"
              placeholder="Detailed notes about this partner..."
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 border border-zinc-300 rounded-md hover:bg-zinc-50 transition disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1f3c88] text-white rounded-md hover:bg-[#1f3c88]/90 transition disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PartnerTableProps {
  partnerCRMData: PartnerCRMRow[];
}

export default function PartnerTable({ partnerCRMData }: PartnerTableProps) {
  const [selectedPartner, setSelectedPartner] = useState<PartnerCRMRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (partner: PartnerCRMRow) => {
    setSelectedPartner(partner);
    setIsModalOpen(true);
  };

  const handleSavePartner = (updates: Partial<PartnerCRMRow>) => {
    // For now, just close the modal - in a real app you'd update the data
    setIsModalOpen(false);
  };

  return (
    <>
      <ClientWrapper
        partnerCRMData={partnerCRMData}
        onRowClick={handleRowClick}
      />

      <PartnerEditModal
        partner={selectedPartner}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePartner}
      />
    </>
  );
}
