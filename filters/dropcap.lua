-- Drop cap only for chapters (i.e., only after \mainmatter).
-- Applies ONLY to the first paragraph of the chapter.
-- If the first paragraph is too short, then NO dropcap is applied for that chapter
-- (we do NOT move it to the next paragraph).
-- Works even if the first paragraph is wrapped in a Div (e.g. ::: {.italic} ...).
-- LaTeX/PDF only. Requires \usepackage{lettrine} in the LaTeX template.

local MIN_PARA_CHARS = 40 -- tweak: e.g. 30..80

local function first_char_utf8(s)
  local first = pandoc.text.sub(s, 1, 1)
  local rest  = pandoc.text.sub(s, 2)
  return first, rest
end

local function para_text(para)
  return (pandoc.utils.stringify(para) or "")
end

local function is_para_long_enough(para)
  local t = para_text(para)
  t = t:gsub("%s+", " "):gsub("^%s+", ""):gsub("%s+$", "")
  return #t >= MIN_PARA_CHARS
end

-- Optional: allow manual opt-out with {.no-dropcap}
local function has_no_dropcap_class(para)
  return para.classes and para.classes:includes("no-dropcap")
end

-- Only first letter is dropcapped; rest of the word stays normal (no forced caps).
local function make_lettrine_for_para(para)
  for i, inline in ipairs(para.content) do
    if inline.t == "Str" then
      local text = inline.text
      if text and text ~= "" then
        local first, rest = first_char_utf8(text)

        -- You can tune indent if you want:
        -- local latex = "\\lettrine[lines=3,findent=0.2em,nindent=0.6em]{"..first.."}{}"
        local latex = "\\lettrine[lines=3]{" .. first .. "}{}"

        para.content[i] = pandoc.RawInline("latex", latex)

        if rest and rest ~= "" then
          table.insert(para.content, i + 1, pandoc.Str(rest))
        end

        return true, para
      end
    end
  end
  return false, para
end

-- Find the FIRST Para inside blocks (recursing into Div).
-- Returns:
--   found (bool), applied (bool), newBlocks (blocks)
local function handle_first_para_in_blocks(blocks)
  for idx, b in ipairs(blocks) do
    if b.t == "Para" then
      -- Decision is ONLY based on this first paragraph:
      if has_no_dropcap_class(b) then
        return true, false, blocks
      end
      if is_para_long_enough(b) then
        local ok, newpara = make_lettrine_for_para(b)
        if ok then
          blocks[idx] = newpara
          return true, true, blocks
        end
        return true, false, blocks
      else
        -- Too short => no dropcap for this chapter
        return true, false, blocks
      end
    elseif b.t == "Div" then
      local found, applied, newcontent = handle_first_para_in_blocks(b.content)
      if found then
        b.content = newcontent
        blocks[idx] = b
        return true, applied, blocks
      end
    end
  end
  return false, false, blocks
end

function Pandoc(doc)
  if not FORMAT:match("latex") then
    return doc
  end

  local out = pandoc.List:new()

  local in_mainmatter = false
  local pending_chapter = false

  for _, block in ipairs(doc.blocks) do
    -- Detect \mainmatter (inserted by your build script)
    if block.t == "RawBlock" and block.format == "latex" then
      if block.text:match("\\mainmatter") then
        in_mainmatter = true
      end
      out:insert(block)
      goto continue
    end

    -- Only start looking for dropcaps after mainmatter
    if in_mainmatter and block.t == "Header" and block.level == 1 then
      pending_chapter = true
      out:insert(block)
      goto continue
    end

    if pending_chapter then
      if block.t == "Para" then
        -- Only consider this first paragraph; if too short, never apply later.
        if has_no_dropcap_class(block) then
          out:insert(block)
        elseif is_para_long_enough(block) then
          local _, newpara = make_lettrine_for_para(block)
          out:insert(newpara)
        else
          out:insert(block)
        end
        pending_chapter = false

      elseif block.t == "Div" then
        -- If the first paragraph is inside a Div, decide based on that one.
        local blocks = pandoc.List:new()
        blocks:insert(block)

        local found, _, newblocks = handle_first_para_in_blocks(blocks)
        out:insert(newblocks[1])

        -- If we found the first paragraph (even if too short), chapter decision is made.
        if found then
          pending_chapter = false
        end

      else
        -- keep blocks until we encounter the first paragraph
        out:insert(block)
      end
    else
      out:insert(block)
    end

    ::continue::
  end

  doc.blocks = out
  return doc
end

