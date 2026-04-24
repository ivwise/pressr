import { useState } from "react";
import { X } from "lucide-react";

interface EditProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentBio: string;
  onSave: (name: string, bio: string) => void;
}

export function EditProfileSheet({ isOpen, onClose, currentName, currentBio, onSave }: EditProfileSheetProps) {
  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(name, bio);
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
          <h2 className="text-xl font-medium">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500 mb-3 block">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00]"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500 mb-3 block">
              Bio
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00]"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-[#FF5C00] text-white py-4 rounded-xl font-medium text-lg"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
