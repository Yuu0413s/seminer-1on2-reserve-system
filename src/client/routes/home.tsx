import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function HomePage() {
	const health = useQuery({
		queryKey: ["health"],
		queryFn: async () => {
			const res = await api.api.health.$get();
			if (!res.ok) {
				throw new Error(`health check failed: ${res.status}`);
			}
			return res.json();
		},
	});

	return (
		<main className="mx-auto max-w-md p-4">
			<h1 className="text-xl font-bold">1on2 予約</h1>
			<p className="mt-2 text-sm text-gray-600">
				API:{" "}
				{health.isPending
					? "確認中…"
					: health.isError
						? "エラー"
						: health.data.status}
			</p>
		</main>
	);
}
