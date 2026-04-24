-- Add policies to allow group creators to delete groups and kick members

-- Allow group creators to delete their groups
DROP POLICY IF EXISTS "Group creators can delete groups" ON public.groups;

CREATE POLICY "Group creators can delete groups"
  ON public.groups FOR DELETE
  USING (auth.uid() = created_by);

-- Allow group creators to delete members (kick) OR users to leave (delete own membership)
DROP POLICY IF EXISTS "Group creators can delete members" ON public.group_members;

CREATE POLICY "Group creators can delete members"
  ON public.group_members FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_id AND created_by = auth.uid()
    )
  );
