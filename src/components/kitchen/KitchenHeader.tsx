import { ChefHat } from 'lucide-react';
import { SignOutButton } from '../shared/SignOutButton';

export function KitchenHeader({ restaurantName }: { restaurantName: string }) {
  return (
    <header className="flex items-center justify-between bg-black px-5 py-4 border-b-2 border-neutral-800">
      <div className="flex items-center gap-3">
        <ChefHat className="w-7 h-7 text-amber-400" />
        <div>
          <h1 className="text-white font-extrabold text-xl leading-none">KITCHEN DISPLAY</h1>
          <p className="text-neutral-500 text-sm">{restaurantName}</p>
        </div>
      </div>
      <SignOutButton className="text-neutral-400 hover:text-white p-2" />
    </header>
  );
}
