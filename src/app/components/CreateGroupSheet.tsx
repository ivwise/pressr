import { useState } from "react";
import { X } from "lucide-react";

interface CreateGroupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (groupName: string) => void;
}

export function CreateGroupSheet({ isOpen, onClose, onCreate }: CreateGroupSheetProps) {
  const [groupName, setGroupName] = useState("");

  if (!isOpen) return null;

  const handleCreate = () => {
    if (groupName.trim()) {
      onCreate(groupName.trim());
      setGroupName("");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onClose}
    >
      <div
        className="bg-[#1A1A1A] w-full max-w-md mx-auto rounded-t-3xl p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium">Create Group</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500 mb-3 block">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Morning Crew, Weekend Warriors"
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreate();
                }
              }}
            />
          </div>

          <div className="bg-[#0F0F0F] rounded-xl p-4">
            <p className="text-sm text-gray-400">
              Create a group to hold each other accountable. You can invite members after creating the group.
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={!groupName.trim()}
            className={`w-full py-4 rounded-xl font-medium text-lg transition-colors ${
              groupName.trim()
                ? "bg-[#FF5C00] text-white"
                : "bg-[#2A2A2A] text-gray-600"
            }`}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
