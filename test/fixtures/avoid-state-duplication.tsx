import React, { useState, useEffect } from 'react';

interface UserProps {
  userId: string;
  userName: string;
  userEmail: string;
}

// Example 1: State initialized from props
export function BadPropsInit({ userId, userName }: UserProps) {
  // Bad: Initializing state from props can cause sync issues
  const [id, setId] = useState(userId);
  const [name, setName] = useState(userName);

  // Props might change but state won't update automatically
  return (
    <div>
      <p>ID: {id}</p>
      <p>Name: {name}</p>
    </div>
  );
}

// Example 2: State duplicating other state
export function BadStateDuplication() {
  const [user, setUser] = useState({
    id: 1,
    name: 'John',
    email: 'john@example.com',
  });

  // Bad: Duplicating user data in separate state
  const [selectedUserId, setSelectedUserId] = useState(user.id);
  const [displayName, setDisplayName] = useState(user.name);

  const selectUser = () => {
    // Updating multiple states that duplicate data
    setSelectedUserId(user.id);
    setDisplayName(user.name);
  };

  return <div>{displayName}</div>;
}

// Example 3: Storing entire object when only using part
export function BadSelectiveUsage() {
  const [fullUserData, setFullUserData] = useState({
    id: 1,
    name: 'John',
    email: 'john@example.com',
    phone: '555-1234',
    address: '123 Main St',
    city: 'Boston',
    state: 'MA',
    zip: '02101',
    country: 'USA',
    avatar: 'avatar.jpg',
    bio: 'Lorem ipsum...',
  });

  // Only using name and email in component
  return (
    <div>
      <h1>{fullUserData.name}</h1>
      <p>{fullUserData.email}</p>
    </div>
  );
}

// Example 4: Good - Using props directly
export function GoodPropsUsage({ userId, userName }: UserProps) {
  // Good: Use props directly instead of copying to state
  return (
    <div>
      <p>ID: {userId}</p>
      <p>Name: {userName}</p>
    </div>
  );
}

// Example 5: Good - Deriving state when needed
export function GoodDerivedState({ userId }: UserProps) {
  const [userDetails, setUserDetails] = useState(null);

  // Good: Derive state from props when necessary
  useEffect(() => {
    fetchUserDetails(userId).then(setUserDetails);
  }, [userId]);

  return <div>{userDetails?.name}</div>;
}

// Example 6: Good - Single source of truth
export function GoodSingleSource() {
  const [users, _setUsers] = useState([{ id: 1, name: 'John', email: 'john@example.com' }]);
  const [selectedUserId, _setSelectedUserId] = useState<number | null>(null);

  // Good: Derive selected user from single source
  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div>
      {selectedUser && (
        <>
          <h1>{selectedUser.name}</h1>
          <p>{selectedUser.email}</p>
        </>
      )}
    </div>
  );
}

// Helper function for examples
async function fetchUserDetails(_userId: string) {
  return { name: 'John Doe', email: 'john@example.com' };
}
