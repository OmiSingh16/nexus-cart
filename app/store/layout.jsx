import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "Nexus. - Store Dashboard",
    description: "Nexus. - Store Dashboard",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <StoreLayout>
                {children}
            </StoreLayout>
        </>
    );
}
