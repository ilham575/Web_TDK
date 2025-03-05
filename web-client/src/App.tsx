import { useEffect, useState } from 'react';
import { getCategories } from './page/api';

type Category = {
  id: number;
  name: string;
  slug: string;
};

function App() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then((data) => {
      console.log(data); // เช็คดู JSON ก่อน
      setCategories(data);
    });
  }, []);

  return (
    <div>
      <h1>Categories</h1>
      {categories.map((category) => (
        <div key={category.id}>
          <h3>{category.name}</h3>
          <p>Slug: {category.slug}</p>
        </div>
      ))}
    </div>
  );
}

export default App;
