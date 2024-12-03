// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface WalletContextProps {
    address: string;
    isLoading: boolean;
    balance: string;
    connect: () => void;
    disconnect: () => void;
    catsContractInstance?: any;
    catsContractFactoryInstance?: any;
}