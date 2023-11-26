import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { App } from "obsidian"
import { pipeline } from "@xenova/transformers"

export const processFiles = async (app: App) => {
	const files = app.vault.getMarkdownFiles()

	const splitter = new RecursiveCharacterTextSplitter({
		chunkSize: 600,
		chunkOverlap: 200
	})

	const docs = await splitter.createDocuments(await Promise.all(files.map(async r => await app.vault.cachedRead(r))), files)
	console.log(docs)
	const embedder = await pipeline("feature-extraction")
	console.log(embedder)

	// const embeddings = await embedder(docs.map(d => d.pageContent))
	// console.log(embeddings)
}
