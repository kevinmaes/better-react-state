import React, { useState } from 'react';

// Example 1: Storing computed values
export function BadShoppingCart() {
  const [items, setItems] = useState<Array<{ id: number; price: number }>>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const addItem = (item: { id: number; price: number }) => {
    const newItems = [...items, item];
    setItems(newItems);
    setTotalPrice(newItems.reduce((sum, item) => sum + item.price, 0));
    setItemCount(newItems.length);
  };

  return (
    <div>
      <p>Items: {itemCount}</p>
      <p>Total: ${totalPrice}</p>
    </div>
  );
}

// Example 2: Storing formatted values
export function BadDateDisplay() {
  const [date, setDate] = useState(new Date());
  const [formattedDate, setFormattedDate] = useState(date.toLocaleDateString());
  const [dayOfWeek, setDayOfWeek] = useState(date.getDay());

  const updateDate = (newDate: Date) => {
    setDate(newDate);
    setFormattedDate(newDate.toLocaleDateString());
    setDayOfWeek(newDate.getDay());
  };

  return <div>{formattedDate}</div>;
}

// Example 3: Good - Computing values during render
export function GoodShoppingCart() {
  const [items, setItems] = useState<Array<{ id: number; price: number }>>([]);

  // Computed during render
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
  const itemCount = items.length;

  const addItem = (item: { id: number; price: number }) => {
    setItems([...items, item]);
  };

  return (
    <div>
      <p>Items: {itemCount}</p>
      <p>Total: ${totalPrice}</p>
    </div>
  );
}
