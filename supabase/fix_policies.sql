-- Fix the infinite recursion in group_members policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;

-- Create a simpler policy: users can view all group members (no recursion)
CREATE POLICY "Users can view group members"
  ON public.group_members FOR SELECT
  USING (true);

-- Also simplify the groups policy to avoid similar issues
DROP POLICY IF EXISTS "Anyone can view groups they are a member of" ON public.groups;

CREATE POLICY "Users can view all groups"
  ON public.groups FOR SELECT
  USING (true);
