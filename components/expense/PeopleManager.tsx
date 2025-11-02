'use client';

import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import HelpButton from '@/components/shared/HelpButton';
import type { Person } from '@/lib/types/expense';
import { generateId } from '@/lib/utils/expense-utils';

interface PeopleManagerProps {
  people: Person[];
  setPeople: (people: Person[]) => void;
}

export default function PeopleManager({ people, setPeople }: PeopleManagerProps) {
  const [newName, setNewName] = useState('');

  const addPerson = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setPeople([...people, { id: generateId(), name: trimmed, active: true }]);
    setNewName('');
  };

  const removePerson = (id: string) => {
    setPeople(people.filter((p) => p.id !== id));
  };

  const toggleActive = (id: string) => {
    setPeople(people.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const activeCo = people.filter((p) => p.active).length;

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600">1</Badge>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg flex-1">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            Add People
          </CardTitle>
          <HelpButton title="Add People to Split" color="text-blue-600">
            <p>Add everyone who is sharing this expense. You can turn people on/off using the switch without deleting them.</p>
          </HelpButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPerson()}
            className="text-base"
          />
          <Button onClick={addPerson} size="icon" className="h-10 w-10 sm:h-9 sm:w-9">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {people.map((person) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="flex items-center gap-2 sm:gap-3 rounded-lg border p-2.5 sm:p-3 min-w-0"
              >
                <Switch
                  checked={person.active}
                  onCheckedChange={() => toggleActive(person.id)}
                  className="flex-shrink-0"
                />
                <Label className="flex-1 cursor-pointer text-sm sm:text-base min-w-0 truncate" htmlFor={person.id}>
                  {person.name}
                </Label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePerson(person.id)}
                  className="h-8 w-8 text-destructive flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {people.length > 0 && (
          <div className="text-xs sm:text-sm text-muted-foreground">
            {activeCo} of {people.length} active
          </div>
        )}
      </CardContent>
    </Card>
  );
}
