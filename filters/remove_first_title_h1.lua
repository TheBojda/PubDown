local removed = false
local book_title = nil

function Meta(meta)
  -- meta.title lehet Inlines is, stringify kell
  if meta.title then
    book_title = pandoc.utils.stringify(meta.title)
  end
end

function Header(el)
  if removed then
    return nil
  end

  -- csak H1-et nézünk
  if el.level ~= 1 then
    return nil
  end

  local t = pandoc.utils.stringify(el.content)

  -- ha ez pont a könyvcím (duplikált H1), töröljük egyszer
  if book_title and t == book_title then
    removed = true
    return {}
  end

  return nil
end
