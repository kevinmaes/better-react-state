import React, { useState } from 'react';

// Example 1: Deeply nested user profile
export function BadUserProfile() {
  const [user, setUser] = useState({
    profile: {
      details: {
        personal: {
          name: {
            first: 'John',
            middle: 'Q',
            last: 'Doe',
          },
          address: {
            street: '123 Main St',
            city: 'Boston',
            state: 'MA',
            country: 'USA',
          },
        },
        professional: {
          company: 'Tech Corp',
          position: 'Developer',
        },
      },
    },
  });

  // Complex update to change city
  const updateCity = (newCity: string) => {
    setUser({
      ...user,
      profile: {
        ...user.profile,
        details: {
          ...user.profile.details,
          personal: {
            ...user.profile.details.personal,
            address: {
              ...user.profile.details.personal.address,
              city: newCity,
            },
          },
        },
      },
    });
  };

  return <div>{user.profile.details.personal.address.city}</div>;
}

// Example 2: Deeply nested app state
export function BadAppState() {
  const [appState, setAppState] = useState({
    ui: {
      modals: {
        settings: {
          tabs: {
            general: {
              isOpen: false,
              content: {},
            },
          },
        },
      },
    },
  });

  return <div>App</div>;
}

// Example 3: Good - Flattened state
export function GoodUserProfile() {
  const [userProfile, setUserProfile] = useState({
    firstName: 'John',
    middleName: 'Q',
    lastName: 'Doe',
    street: '123 Main St',
    city: 'Boston',
    state: 'MA',
    country: 'USA',
    company: 'Tech Corp',
    position: 'Developer',
  });

  const updateCity = (newCity: string) => {
    setUserProfile({
      ...userProfile,
      city: newCity,
    });
  };

  return <div>{userProfile.city}</div>;
}

// Example 4: Good - Normalized state
export function GoodNormalizedState() {
  const [entities, setEntities] = useState({
    users: {
      1: { id: 1, name: 'John', addressId: 'addr1' },
    },
    addresses: {
      addr1: { id: 'addr1', street: '123 Main St', city: 'Boston' },
    },
  });

  return <div>Normalized</div>;
}

// Example 5: Acceptable - 2 levels deep
export function AcceptableNesting() {
  const [settings, setSettings] = useState({
    theme: {
      primary: 'blue',
      secondary: 'gray',
    },
    notifications: {
      email: true,
      push: false,
    },
  });

  return <div>Settings</div>;
}
