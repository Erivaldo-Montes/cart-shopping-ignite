import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  }, []);

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cartPreviousValue, cart]);

  const addProduct = async (productId: number) => {
    try {
      const stock = await api
        .get(`/stock/${productId}`)
        .then((res) => Number(res.data.amount));

      const productExist = cart.find((item) => item.id === productId);
      const currentAmount = productExist ? productExist.amount : 0;

      if (currentAmount + 1 > stock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExist) {
        setCart((state) => {
          return state.map((item) => {
            if (item.id === productExist.id) {
              item.amount = item.amount + 1;
            }

            return item;
          });
        });
      } else {
        const product = (await api
          .get(`products/${productId}`)
          .then((res) => res.data)) as Product;

        const cartCopy = [...cart];

        cartCopy.push({
          ...product,
          amount: 1,
        });

        setCart(cartCopy);
      }
    } catch {
      // TODO
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // TODO
      const productExits = cart.find((item) => item.id === productId);
      if (productExits) {
        const cartFiltered = cart.filter((item) => item.id !== productId);

        console.log(cartFiltered);
        setCart(cartFiltered);
      } else {
        throw new Error();
      }
    } catch {
      // TODO
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const currentProduct = cart.find((item) => item.id === productId);

      const stock = await api
        .get(`/stock/${productId}`)
        .then((res) => res.data.amount);

      if (amount > stock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (!currentProduct) {
        throw Error();
      }

      setCart((state) => {
        const updatedProduct = state.map((item) => {
          if (item.id === productId) {
            item.amount = amount;
          }
          return item;
        });

        return updatedProduct;
      });
    } catch {
      // TODO
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
